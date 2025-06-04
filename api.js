// Copyright (c) 2025 Kelvin Kauan Melo Mattos
// Todos os direitos reservados.
// Este código é de uso exclusivo do autor.

const express = require('express');
const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json()); // habilita leitura do body JSON

const writeLog = console.log;
const DESTINO = path.resolve(__dirname, 'relatorio_inventario.xls');
let isRunning = false;
let activeBrowser = null;
let timeoutTimer = null;

const { pipeline } = require('stream/promises');

// Função para tentativa repetida em caso de falha
async function retryOnFail(action, maxRetries, waitTime) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await action();
      writeLog(`Ação concluída com sucesso na tentativa ${attempt}.`);
      return;
    } catch (error) {
      console.error(`Erro na tentativa ${attempt}: ${error.message}`);
      if (attempt < maxRetries) {
        writeLog(`Esperando ${waitTime / 1000} segundos antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('Máximo de tentativas atingido. Ação falhou.');
        throw error;
      }
    }
  }
}

app.post('/run', async (req, res) => {
  const { user, pass, url } = req.body;

  // Verifica se todas as infos foram enviadas
  if (!user || !pass || !url) {
    return res.status(400).send('❌ Parâmetros obrigatórios: user, pass, url');
  }

  // Se já tiver uma execução, encerra a anterior antes de continuar
  if (isRunning) {
    console.warn('⛔ Execução anterior detectada. Fechando navegador...');
    try {
      if (activeBrowser) {
        await activeBrowser.close();
        console.log('🧯 Navegador anterior fechado.');
      }
    } catch (e) {
      console.error('❌ Erro ao fechar navegador anterior:', e.message);
    }
    clearTimeout(timeoutTimer);
    isRunning = false;
  }
  isRunning = true;

  try {
    // Apaga arquivo existente antes de baixar outro
    if (fs.existsSync(DESTINO)) {
      console.log('🧹 Removendo inventário anterior...');
      fs.unlinkSync(DESTINO);
    }

    console.log('🚀 Iniciando processo de login...');
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    activeBrowser = browser;

    const page = await browser.newPage();
    console.log('🌐 Acessando o site do Tiny...');
    await page.goto('https://erp.tiny.com.br/login', { waitUntil: 'networkidle2' });

    await retryOnFail(async () => {
      console.log('📝 Preenchendo campo de usuário...');
      await page.waitForSelector('#username');
      await page.click('#username');
      await page.keyboard.type(user, { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 15, 2000)

    await retryOnFail(async () => {
      console.log('➡️ Clicando no botão "Avançar"...');
      await page.evaluate(() => {
        const btn = document.querySelector(
          '#kc-content-wrapper > react-login-wc > section > div > main > aside.sc-jsJBEP.hfxeyl > div > button'
        );
        if (btn) btn.click();
      });
    }, 15, 2000)

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await retryOnFail(async () => {
      console.log('🔒 Preenchendo a senha...');
      await page.waitForSelector('#password', { timeout: 10000 });
      await page.click('#password');
      await page.keyboard.type(pass, { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 15, 2000)

    await retryOnFail(async () => {
      console.log('🔓 Clicando no botão "Entrar"...');
      await page.evaluate(() => {
        const btn = document.querySelector(
          '#kc-content-wrapper > react-login-wc > section > div > main > aside.sc-jsJBEP.hfxeyl > div > form > button'
        );
        if (btn) btn.click();
      });
    }, 15, 2000)    

    console.log('⏳ Aguardando possíveis modais...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await retryOnFail(async () => {
      console.log('🕵️ Verificando se há sessão ativa anterior...');
      const modalBtn = await page.$(
        '#bs-modal-ui-popup > div > div > div > div.modal-footer > button.btn.btn-primary'
      );
      if (modalBtn) {
        console.log('⚠️ Sessão anterior detectada! Clicando em "Entrar assim mesmo"...');
        await modalBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('✅ Nenhuma sessão anterior detectada.');
      }      
    }, 15, 2000)


    console.log('🍪 Extraindo cookies da sessão...');
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');    
    
    const file = fs.createWriteStream(DESTINO);
    console.log('⬇️ Iniciando download do relatório...');

    await retryOnFail(async () => {
      const options = {
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Mozilla/5.0'
        }
      };

      const response = await new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Status code: ${res.statusCode}`));
          } else {
            resolve(res);
          }
        }).on('error', reject);
      });

      await pipeline(response, file);
      console.log('✅ Download concluído com sucesso!');
    }, 15, 2000);

    // 👇 Só executa isso DEPOIS do download estar 100% concluído:
    return res.download(DESTINO, 'inventario.xls', async (err) => {
      clearTimeout(timeoutTimer);

      if (err) {
        console.error('❌ Erro ao enviar arquivo:', err);
      } else {
        console.log('🗑️ Removendo arquivo após envio...');
        fs.unlinkSync(DESTINO);
      }

      if (activeBrowser) {
        await activeBrowser.close();
        console.log('🧯 Navegador fechado após envio.');
      }

      isRunning = false;
      activeBrowser = null;
    });
  } catch (err) {
    console.error('❌ Erro geral:', err);
    if (activeBrowser) await activeBrowser.close();
    isRunning = false;
    activeBrowser = null;
    clearTimeout(timeoutTimer);
    res.status(500).send('Erro ao realizar login ou baixar arquivo.');
  }
});

app.get('/encerrar', async (req, res) => {
  if (!activeBrowser) {
    return res.status(200).send('❌ Não há páginas no navegador aberto.');
  }

  try {
    const pages = await activeBrowser.pages();
    const total = pages.length;

    let fechadas = 0;
    let falhas = 0;

    for (const page of pages) {
      try {
        await page.close();
        fechadas++;
      } catch (err) {
        falhas++;
        console.error(`Erro ao fechar página: ${err.message}`);
      }
    }

    // Fecha o navegador inteiro depois de fechar as páginas
    await activeBrowser.close();
    activeBrowser = null;
    isRunning = false;
    clearTimeout(timeoutTimer);

    const msg = `🧯 Foram encontradas ${total} páginas abertas, ${fechadas} foram fechadas com sucesso e ${falhas} falharam.`;
    console.log(msg);
    res.status(200).send(msg);
  } catch (err) {
    console.error('Erro ao encerrar navegador:', err.message);
    res.status(500).send('Erro ao encerrar navegador.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://192.168.15.177:${PORT}/run (POST) \n body: \n{ \n"user":"{user}", \n"pass":"pass", \n"url":"url" \n} \n\n ########################################################## \n\n 🚀 API rodando em http://192.168.15.177:${PORT}/encerrar (GET)`);
});
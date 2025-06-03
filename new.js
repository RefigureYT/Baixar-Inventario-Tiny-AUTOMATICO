// Copyright (c) 2025 Kelvin Kauan Melo Mattos
// Todos os direitos reservados.
// Este código é de uso exclusivo do autor.

const express = require('express');
const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.get('/LT', async (req, res) => {
  try {
    console.log('🚀 Iniciando processo de login...');
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();
    console.log('🌐 Acessando o site do Tiny...');
    await page.goto('https://erp.tiny.com.br/login', { waitUntil: 'networkidle2' });

    console.log('📝 Preenchendo campo de usuário...');
    await page.waitForSelector('#username');
    await page.click('#username');
    await page.keyboard.type('usuario@empresa', { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('➡️ Clicando no botão "Avançar"...');
    await page.evaluate(() => {
      const btn = document.querySelector(
        '#kc-content-wrapper > react-login-wc > section > div > main > aside.sc-jsJBEP.hfxeyl > div > button'
      );
      if (btn) btn.click();
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔒 Preenchendo a senha...');
    await page.waitForSelector('#password', { timeout: 10000 });
    await page.click('#password');
    await page.keyboard.type('senhaDoUsuario', { delay: 100 });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔓 Clicando no botão "Entrar"...');
    await page.evaluate(() => {
      const btn = document.querySelector(
        '#kc-content-wrapper > react-login-wc > section > div > main > aside.sc-jsJBEP.hfxeyl > div > form > button'
      );
      if (btn) btn.click();
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Aguarda 5 segundos para o modal aparecer, se necessário
    console.log('⏳ Aguardando possíveis modais...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verifica se há sessão anterior
    console.log('🕵️ Verificando se há sessão ativa anterior...');
    const loginEmOutroDispositivo = await page.$(
    '#bs-modal-ui-popup > div > div > div > div.modal-footer > button.btn.btn-primary'
    );

    if (loginEmOutroDispositivo) {
    console.log('⚠️ Sessão anterior detectada! Clicando em "Entrar assim mesmo"...');
    await loginEmOutroDispositivo.click();
    await new Promise(resolve => setTimeout(resolve, 2000)); // espera 2s após clicar
    } else {
    console.log('✅ Nenhuma sessão anterior detectada.');
    }

    // Agora sim, extrair os cookies
    console.log('🍪 Extraindo cookies da sessão...');
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const downloadUrl = 'https://erp.tiny.com.br/relatorios/relatorio.estoque.inventario.download.xls?produto=&idDeposito={idEstoque}&idCategoria=0&descricaoCategoria=&exibirSaldo=&idCategoriaFiltro=0&layoutExportacao=R&formatoPlanilha=xls&exibirEstoqueDisponivel=N&produtoSituacao=A&idFornecedor=0&valorBaseado=0';

    const destino = './relatorio_inventario.xls';
    const file = fs.createWriteStream(destino);

    console.log('⬇️ Iniciando download do relatório...');
    const options = {
      headers: {
        Cookie: cookieHeader,
        'User-Agent': 'Mozilla/5.0'
      }
    };

    https.get(downloadUrl, options, (response) => {
      if (response.statusCode !== 200) {
        console.error('❌ Erro ao baixar:', response.statusCode);
        return res.status(500).send('Erro ao baixar o arquivo.');
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅ Download concluído com sucesso!');
        res.send('✅ Login e download finalizados com sucesso!');
      });
    });

  } catch (err) {
    console.error('❌ Erro geral:', err);
    res.status(500).send('Erro ao realizar login ou baixar arquivo.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://192.168.15.177:${PORT}/LT`);
});

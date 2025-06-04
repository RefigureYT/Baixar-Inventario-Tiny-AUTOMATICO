⚠️ Todos os direitos reservados. Este código é de uso exclusivo do autor. A reprodução, modificação ou redistribuição não são permitidas.

```markdown
# 📦 EstoqueA – Automação de Download no Tiny ERP

> Projeto Node.js com Puppeteer e Express para automação de login, extração de cookies e download de relatórios autenticados do Tiny ERP.

---

## 🚀 Funcionalidade

Este sistema expõe uma API local (`/run`) que realiza:

1. Acesso automatizado ao Tiny ERP
2. Preenchimento de login e senha
3. Detecção de modais e sessões anteriores
4. Extração de cookies de sessão
5. Download direto de arquivos protegidos (ex: inventário)
6. Retorno do arquivo `.xls` via HTTP

---

## 🛠️ Tecnologias

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Puppeteer](https://pptr.dev/)
- [HTTPS / fs / path](https://nodejs.org/api/)

---

## 📂 Estrutura

```

project-root/
├── app.js              # API Express com Puppeteer
├── relatorio\_inventario.xls  # Gerado automaticamente
└── README.md

````

---

## 📦 Instalação

```bash
git clone https://github.com/seu-usuario/EstoqueA.git
cd EstoqueA
npm install
````

---

## ▶️ Uso

```bash
node app.js
```

Depois, envie uma requisição POST para:

```
POST http://localhost:3001/run
Content-Type: application/json

{
  "user": "seu@email.com",
  "pass": "suaSenha123",
  "url": "https://erp.tiny.com.br/exportacao/inventario"
}
```

✅ O sistema fará login, baixará o arquivo e retornará o `.xls`.

---

## ⚠️ Observações

* Certifique-se de que sua conta do Tiny tem acesso ao link enviado.
* O script usa **Puppeteer em modo visível** (`headless: false`).
* Um timeout de segurança encerra tudo após 10 minutos.
* Perfis temporários do Chrome são criados automaticamente em `/Temp`.

---

## 📄 Licença

```
Copyright (c) 2025 Kelvin Kauan Melo Mattos  
Todos os direitos reservados.  
Código de uso exclusivo do autor.
```
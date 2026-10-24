# Operação Meia-Vida (Campus Iporá, IF Goiano)

Jogo didático multijogador sobre radioatividade. Qualquer pessoa entra só com o link, sem conta nem login. O servidor não precisa instalar nada além do Node.js.

## Como está organizado

- `server.js`: servidor (entrega a página e conecta os jogadores em tempo real)
- `index.html`: o jogo (mapa, classes, desafios, chat)
- `package.json`: diz ao serviço de hospedagem como iniciar (`npm start`)

## Só tem celular?

Use a opção 3 e suba os 3 arquivos (`server.js`, `index.html` e `package.json`) direto pelo navegador do celular, sem pastas. Se o serviço pedir cartão, peça emprestado um computador só para a apresentação e use a opção 2.

## Opção 1: testar no seu computador (5 minutos)

1. Instale o Node.js (versão 18 ou mais nova) em nodejs.org.
2. Abra um terminal na pasta do projeto e rode: `node server.js`
3. Abra http://localhost:3000 no navegador. Abra em duas abas para ver os avatares se encontrando.
4. Para os colegas na **mesma rede Wi-Fi**, descubra o IP do seu computador (por exemplo 192.168.0.15) e passe o link `http://192.168.0.15:3000`. Algumas redes de escola bloqueiam isso. Se não funcionar, use a opção 2 ou 3.

## Opção 2: link público a partir do seu computador (bom para a apresentação)

Com o servidor rodando (passo 2 acima), use um túnel gratuito, como o **Cloudflare Quick Tunnel**: instale o `cloudflared` e rode `cloudflared tunnel --url http://localhost:3000`. Ele mostra um link `https://...trycloudflare.com` que qualquer pessoa abre. O jogo só funciona enquanto seu computador estiver ligado e o comando rodando. Confira as instruções atuais no site da Cloudflare.

## Opção 3: hospedar na internet (link fixo)

O exemplo usa o Render (render.com), que aceita WebSocket. Os passos podem mudar um pouco com o tempo.

1. Crie uma conta no GitHub e um repositório novo. Envie os arquivos deste projeto para ele.
2. Crie uma conta no Render e escolha **New > Web Service**. Conecte o repositório.
3. Configure: Runtime **Node**, Build Command em branco (ou `npm install`), Start Command `npm start`, plano **Free**.
4. Clique em criar. Quando terminar, o Render mostra o link público (algo como `https://seu-jogo.onrender.com`).

Observações:
- O plano gratuito "dorme" depois de 15 minutos sem uso. O primeiro acesso depois disso pode levar cerca de 1 minuto. Abra o link uns minutos antes da apresentação.
- O Render pode pedir cartão de crédito para criar o serviço, mesmo no plano gratuito. Se for o caso, use a opção 2.

## Salas

Cada grupo pode ter a sua sala, só mudando o link: `https://seu-link/?sala=turma-a`. Quem entra sem `?sala=` vai para a sala `geral`. Cada sala aceita até 300 pessoas.

## Checklist de teste

- [ ] Duas pessoas abrem o link e se veem no mapa
- [ ] O chat chega nos dois aparelhos
- [ ] Acertar um desafio reduz a barra da Fonte Ômega para os dois
- [ ] Uma pessoa sai e o avatar dela some

## Limitações

Não há contas, ranking guardado nem histórico: tudo vive enquanto o servidor estiver ligado. O servidor limita o tamanho das mensagens, a velocidade do chat e o ganho de pontos, mas não é à prova de quem queira trapacear.

# TactiPlan — Textos para App Store e Google Play (pt-BR)

Cole cada bloco no campo correspondente da App Store Connect / Google Play Console.

---

## Nome do app
**TactiPlan — Gestão de treinos**

(iOS aceita até 30 chars, Google até 30. Formato acima cabe em ambos.)

---

## Subtítulo / short description (30 chars iOS, 80 Android)

- **iOS Subtítulo**: `Treinos, jogos e tática`
- **Android Short description**: `Planeje treinos, monte escalações e acompanhe estatísticas do seu time.`

---

## Descrição longa (~4000 chars)

**Plataforma profissional de gestão de treinos para treinadores de futebol e futsal.**

Chega de planilha. TactiPlan é o app onde você organiza a semana do seu time, monta escalação, registra o que aconteceu em cada treino e cada jogo, e sai com relatórios prontos pra apresentar pra diretoria.

### O que o TactiPlan faz por você

🗓️ **Programação semanal (microciclos)**
Cada semana tem 7 sessões. Cada sessão tem 6 blocos (aquecimento, preparatório, 3 atividades principais, complementar). Você monta o treino todo em minutos, define pilar (tático, físico, técnico, mental), conteúdo (organização ofensiva, transição, bola parada…) e submomento.

⚽ **Gestão de jogos**
Cadastre o adversário, a rodada, o local (casa/fora), o vídeo do jogo. Escale titulares e reservas, registre gols por minuto/tipo, cartões e substituições. Estatísticas geram automaticamente: pontos ganhos, sequência de vitórias, aproveitamento, artilharia, assistências, minutagem.

👥 **Plantel completo**
Cadastre atletas com foto, data de nascimento, altura, pé preferencial, último clube. Organize por grupo (G1/G2/G3/Transição/DM) e por categoria (Sub-15, Sub-17, Profissional…). PDF do plantel sai com a foto de cada atleta.

🏆 **Campeonatos**
Cadastre a competição (ex.: Brasileirão Série D 2026), vincule cada jogo. As estatísticas separam por competição.

📊 **Relatórios profissionais**
Exportação em PDF landscape (estilo relatório de clube pro) e Excel:
- Desempenho em jogos (histórico, KPIs, sequências, artilharia)
- Distribuição de treinos por pilar
- Plantel completo com fotos
- Convocação do próximo jogo
- Relatório executivo do clube (tudo consolidado num único PDF)

🎯 **Quadro Tático interativo**
Desenhe jogadas, animações e movimentações. Exporte como vídeo pra mandar no grupo do WhatsApp.

🎨 **Identidade do seu clube**
Cada clube configura sua cor primária. O app e todos os PDFs adotam a cor do seu clube.

### Planos

- **Pro** — R$ 39,90/mês (ou R$ 19,90/mês no anual). 1 clube, atletas ilimitados.
- **Clube** — R$ 89/mês (ou R$ 49,90/mês no anual). Até 3 clubes, múltiplos treinadores, permissões por papel.

**30 dias grátis** no plano Clube (o mais completo) — sem cartão de crédito. Assine só se gostar.

### Quem já usa?

Treinadores de bases profissionais e escolinhas, comissões técnicas de futsal amador, analistas de desempenho. Feito por quem entende de futebol e por quem entende de software.

### Suporte

E-mail: tactiplan@faggin.com.br
WhatsApp: (62) 99635-9774

---

## Keywords (iOS App Store — 100 chars separadas por vírgula)

`futebol,futsal,treino,tático,escalação,plantel,microciclo,treinador,estatística,taticaboard`

---

## Category

- **iOS Primary**: Sports
- **iOS Secondary**: Productivity
- **Android**: Sports

---

## Notes for Review (App Store)

```
TactiPlan é um app SaaS pra treinadores de futebol/futsal.

Como testar:
- Email: demo@tactiplan.com
- Senha: Demo1234
(essa conta tem trial ativo + dados de exemplo)

O checkout de assinatura abre o navegador externo (Mercado Pago) — não é
in-app purchase. Isso é aceitável conforme Guideline 3.1.3(b) porque:
- Nosso app é SaaS que fornece serviços digitais consumidos em múltiplos
  dispositivos (web, mobile, desktop).
- Não citamos preços melhores fora do app.
- Usuários existentes conseguem usar contas assinadas fora do app.

Se qualquer dúvida sobre o funcionamento, contato:
tactiplan@faggin.com.br
```

---

## Data Safety (Google) / App Privacy (iOS)

### Dados coletados

| Tipo | Item | Uso | Vinculado ao usuário? | Rastreamento? |
|------|------|-----|----------------------|---------------|
| Contact Info | Nome | Identificar o coach | Sim | Não |
| Contact Info | Email | Login + comunicações transacionais | Sim | Não |
| Identifiers | User ID | Sessão + associar dados no clube | Sim | Não |
| Financial Info | Histórico de compras | Ativar/renovar assinatura | Sim | Não |
| User Content | Fotos dos atletas | Exibir no plantel/PDF | Sim | Não |
| Diagnostics | Crash logs | Debug (Sentry) | Não | Não |

### Dados NÃO coletados

- Localização (nenhum tipo)
- Saúde/fitness
- Contatos do device
- Mensagens / e-mails
- ID de publicidade
- Dados de navegação fora do app
- Áudio / mídia sensível

### Segurança

- Dados em trânsito: HTTPS/TLS 1.2+ obrigatório
- Dados em repouso: PostgreSQL com backups diários
- Senhas: bcrypt com salt
- Login: JWT com expiração 7d
- Direito de excluir conta: Configurações → Zona de perigo → Excluir conta

---

## Content Rating (Google)

Responda todas com **Não**:
- Violência
- Nudez sexual
- Linguagem obscena
- Substâncias controladas
- Simulação de jogos de azar
- Comunicação com usuários (não temos chat público)
- Compartilha localização
- Compra digital (sim, mas via web externa — declare)

Rating final esperado: **Livre** / **PEGI 3**.

---

## Screenshots — sugestões (o que enquadrar)

Prepare 5-6 screenshots por tamanho de tela. Sugestões:

1. **Home** — visão geral do clube (mostra o "Relatório do Clube")
2. **Programação** — calendário da semana com blocos coloridos
3. **Escalação no jogo** — modal do GameModal com campo desenhado
4. **Estatísticas** — dashboard de jogos com KPIs grandes e histórico
5. **Plantel** — lista de atletas com fotos
6. **PDF de saída** — screenshot do PDF gerado (opcional, poderoso pra vendas)

Ferramentas úteis pra gerar screenshots em vários tamanhos:
- https://appscreens.com/
- https://previewed.app/
- Screenshot direto no simulador (Xcode: iPhone 15 Pro Max = 6.7")

---

## Feature graphic (Google Play — 1024×500)

Mockup sugerido:
- Fundo: gradient azul (#1e3a8a → #2563eb)
- Esquerda: logo + slogan "Gestão profissional de treinos"
- Direita: mockup de celular com screenshot do dashboard

Se não tiver design: gerar com https://previewed.app/template/social-media/google-play-feature-graphic

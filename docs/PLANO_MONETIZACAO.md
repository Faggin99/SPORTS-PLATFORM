# Plano de Monetizacao - TactiPlan

## Referencia de mercado

**TacticalPad** (concorrente direto):
- Desktop + Mobile: R$ 299/ano
- So Desktop: R$ 199/ano
- So Mobile: R$ 100/ano
- Sem free tier, apenas demo
- Foco em quadro tatico/animacao
- 1 milhao de downloads, clubes profissionais

**Nossa vantagem**: escopo muito maior que so quadro tatico. Temos microciclos, plantel, jogos, estatisticas, tema do mes, multi-clube, PWA. Concorremos tambem com Hudl/Coach's Eye no nicho analytics.

---

## Estrutura de Planos

### Gratuito (aquisicao de usuarios)
**R$ 0** - Para sempre
- 1 clube
- Ate 15 atletas
- Microciclos e sessoes de treino basicos
- Quadro tatico (ate 5 jogadas salvas)
- Sem estatisticas avancadas
- Sem exportacao PDF/video
- Marca TactiPlan no PDF

### Essencial
**R$ 19,90/mes** ou **R$ 199/ano** (economia de R$ 40)
- Ate 3 clubes
- Ate 30 atletas por clube
- Microciclos ilimitados
- Estatisticas completas de treino
- Estatisticas de jogos (gols, cartoes, minutos)
- Tema do mes com aderencia
- Exportacao PDF (sem marca TactiPlan)
- Quadro tatico ilimitado
- Suporte por email
- **Target**: treinador individual, escolinhas pequenas

### Pro
**R$ 39,90/mes** ou **R$ 399/ano** (economia de R$ 80)
- Clubes ilimitados
- Atletas ilimitados
- Tudo do Essencial
- Exportacao de **video** do quadro tatico
- Relatorios consolidados (pdf personalizado)
- Historico de temas e comparativos
- Upload de video de sessoes (ate 2GB)
- Backup automatico na nuvem
- Suporte prioritario (chat/whatsapp)
- **Target**: treinadores profissionais, clubes medios

### Escolinha / Clube (Enterprise)
**Sob consulta** (a partir de R$ 990/mes)
- Tudo do Pro
- **Multi-usuario**: treinador chefe + auxiliares (cada um com login)
- Permissoes por nivel (head coach ve tudo, auxiliar ve apenas seu grupo)
- Dashboard consolidado da escolinha
- White-label opcional (sua marca no app)
- SLA 99.9% + suporte dedicado
- Treinamento inicial da equipe (1h call)
- Integracao com sistemas do clube (API)
- **Target**: escolinhas com +4 treinadores, clubes profissionais, federacoes

---

## Sistema de cobranca

### Provedor recomendado: **Asaas** (Brasil)
- PIX automatico recorrente (exclusivo do Asaas - Mercado Pago nao tem)
- Boleto
- Cartao de credito (recorrencia)
- API completa em portugues
- Taxa: 1,99% + R$ 0,49 por cartao / R$ 1,49 por PIX
- **Por que Asaas**: muito usado por SaaS brasileiros, cancelamento facil, interface amigavel

### Alternativa: **Stripe** (internacional)
- Cartao credito (brasileiros + estrangeiros)
- Boleto brasileiro
- Melhor UX de checkout (Stripe Checkout pre-pronto)
- Taxa: 3,99% + R$ 0,39 por transacao
- **Para quando**: quisermos vender para America Latina/Europa

### Implementacao tecnica - Fase 1 (MVP)
**2-3 semanas de dev**

1. Nova tabela `subscriptions`:
   ```sql
   id, user_id, plan ('free','essencial','pro','enterprise'),
   status ('active','trialing','past_due','canceled'),
   started_at, current_period_end,
   asaas_subscription_id, canceled_at
   ```

2. Integracao Asaas:
   - Criar cliente no Asaas quando user registra
   - Endpoint webhook `/api/webhooks/asaas` pra receber eventos (pagamento confirmado, cancelado, falhou)
   - Rota `/api/subscriptions/upgrade` que cria a assinatura no Asaas e retorna URL de pagamento
   - Middleware `checkPlan` nas rotas que exigem plano pago

3. Frontend:
   - Nova pagina `/planos` na landing com comparativo
   - Pagina `/billing` dentro do app mostrando plano atual + botao upgrade/cancelar
   - Banner "Upgrade pra Pro" em features bloqueadas

4. Limitacoes (enforcement):
   - Plano gratuito: checar numero de clubes/atletas antes de criar
   - Essencial: checar antes de criar 4 clube ou 31 atleta
   - Pro: sem limites
   - Usar o middleware `checkPlan(['essencial','pro'])` nas rotas protegidas

5. Trial de 14 dias:
   - Todo novo usuario entra automatico no plano Pro por 14 dias
   - Depois cai pro Free se nao pagar
   - Envio de email nos dias 10, 13 e 14 lembrando

---

## Landing Page - O que mudar

### Estrutura ideal (baseada no TacticalPad + ajustes)

1. **Hero** - Ja temos, melhorar com screenshot real do app
2. **Social Proof** - "Usado por treinadores de X clubes" (depois que tiver)
3. **Features visuais** - Ja temos 6 cards, adicionar screenshots dentro
4. **Demonstracao em video** - Mostrar o app em uso (YouTube embed de 90s)
5. **Comparativo** vs TacticalPad (sem citar o nome - "outras plataformas")
6. **Precos** - Tabela com 4 planos (Free + 3 pagos) - PRIORIDADE
7. **FAQ** - "Posso cancelar?", "Funciona offline?", "Quantos clubes?"
8. **Depoimentos** - quando tiver
9. **Download** - Ja temos
10. **CTA final** - "Comece gratis, sem cartao"

### Diferenciadores pra destacar

- **Free tier real**: TacticalPad so tem demo, nos temos plano gratuito
- **Mais features**: microciclos + plantel + jogos + tatico tudo num app
- **Brasileiro**: PIX, suporte em PT, precos em BRL sem dolar
- **Web + desktop + mobile**: PWA funciona em qualquer lugar
- **Preco**: Essencial R$ 199/ano iguala o TacticalPad Desktop mas com muito mais

---

## Roadmap de implementacao

### Fase 1 - Conteudo + Landing (1-2 dias)
- Reformular landing com referencia TacticalPad
- Adicionar secao de precos (ainda como "em breve")
- Adicionar FAQ
- Adicionar screenshots reais do app
- Publicar

### Fase 2 - Conta Asaas + Backend (1 semana)
- Criar conta Asaas
- Schema de subscriptions
- Endpoints backend
- Webhooks
- Testar em sandbox

### Fase 3 - UI + Checkout (1 semana)
- Pagina de planos na landing
- Pagina de billing no app
- Fluxo de upgrade/downgrade
- Enforcement dos limites
- Trial de 14 dias

### Fase 4 - Go-live (poucos dias)
- Ativar cobranca no Asaas (production)
- Divulgar
- Monitorar primeiras assinaturas

**Total: 3-4 semanas de dev ativo**

---

## Decisoes confirmadas com usuario (21/04/2026)

1. **Nome dos planos**: Essencial + Pro (confirmado)
2. **Precos**: R$ 199/ano (Essencial), R$ 399/ano (Pro) - confirmado
3. **Trial**: **30 dias** gratis do Pro
4. **Reembolso**: **garantia de 7 dias** apos primeira cobranca
5. **CNPJ**: **MEI** ativo
6. **Policies**: criadas em `docs/POLITICA_PRIVACIDADE.md` e `docs/TERMOS_USO.md` - aguardando dados do MEI (nome, CNPJ, endereco, responsavel)
7. **Cupons**: planejamento para oferecer 10-15% de desconto em campanhas futuras

## Dados pendentes do usuario para finalizar policies

Para publicar a politica de privacidade e termos de uso, precisa fornecer:
- Nome da empresa (razao social do MEI)
- CNPJ
- Endereco completo registrado no MEI
- Nome do responsavel (voce)
- Telefone WhatsApp de suporte
- Cidade/UF do foro

Substituir os placeholders `{{NOME_DA_EMPRESA}}`, `{{CNPJ_MEI}}`, `{{ENDERECO_COMPLETO}}`, `{{NOME_RESPONSAVEL}}`, `{{TELEFONE_WHATSAPP}}`, `{{CIDADE}}`, `{{UF}}` nos arquivos de policy.

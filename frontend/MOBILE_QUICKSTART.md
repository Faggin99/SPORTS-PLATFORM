# TactiPlan Mobile — Quickstart

**TL;DR**: o app iOS + Android está preparado. Falta apenas você criar as contas nas lojas e rodar o build local.

## O QUE JÁ ESTÁ PRONTO ✅

- Capacitor v8 instalado (iOS + Android)
- `capacitor.config.json` com bundle ID `com.faggin.tactiplan`, cores, splash config
- Assets base em `resources/` (icon 1024, splash 2732, splash dark)
- Scripts npm: `cap:sync`, `cap:add:ios/android`, `cap:open:*`, `cap:assets`
- Abstrações em `src/lib/platform.js` (openExternalUrl, isNative, status bar)
- **BillingPage** já usa `openExternalUrl` — pagamento MP abre no browser externo em nativo (evita rejeição Apple 3.1.1)
- Templates prontos em `mobile-templates/`:
  - `store-listing-pt-BR.md` — textos das lojas
  - `PrivacyInfo.xcprivacy` — privacy manifest iOS 17+
  - `AndroidManifest-additions.md` — permissões Android
- Guia detalhado em `MOBILE_PUBLISHING.md`

## O QUE VOCÊ PRECISA FAZER 📋

### 1. Contas nas lojas (você mesmo)

| Loja | O que | Preço | Prazo |
|------|-------|-------|-------|
| Apple Developer | Cadastro + verificação de identidade + pagamento | US$ 99/ano | 1-2 dias |
| Google Play Console | Cadastro + pagamento (uma vez) | US$ 25 | Imediato |

### 2. Máquina local (Mac pra iOS, qualquer pra Android)

Instale:
- **Node 20+** (já usa)
- **Xcode 15+** (só macOS) + CocoaPods (`sudo gem install cocoapods`)
- **Android Studio** + JDK 17

### 3. Clone o repo na máquina local, rode:

```bash
cd frontend
npm install
npm run cap:add:ios         # gera pasta ios/
npm run cap:add:android     # gera pasta android/
npm install --save-dev @capacitor/assets
npm run cap:assets          # gera ícones e splash em TODOS os tamanhos
npm run cap:sync            # builda web + sincroniza
```

### 4. Abrir cada plataforma

```bash
npm run cap:open:ios        # abre Xcode
npm run cap:open:android    # abre Android Studio
```

E siga o guia detalhado em [MOBILE_PUBLISHING.md](./MOBILE_PUBLISHING.md).

## FLUXO RÁPIDO DE UPDATE (depois da primeira publicação)

Mudou algo no React?

```bash
# na sua máquina local
git pull
cd frontend
npm run cap:sync
# incrementar version (iOS Xcode Build+1, Android build.gradle versionCode+1)
npm run cap:open:ios     # Xcode → Archive → Distribute
npm run cap:open:android # Android Studio → Build → Bundle → Upload no Play Console
```

## PRIMEIROS PASSOS EM MENOS DE 15 MINUTOS

1. Abre https://developer.apple.com/programs/enroll/ e paga (é o mais lento — verificação de identidade demora)
2. Enquanto isso, abre https://play.google.com/console/signup e paga
3. Instala Xcode (se Mac) — 30GB, demora
4. Instala Android Studio
5. Clone o repo, roda os 5 comandos da seção 3
6. Segue o guia detalhado

## SUPORTE

Todo o passo-a-passo tá em `MOBILE_PUBLISHING.md`. Se travar em algum ponto, me chama que eu ajudo a debugar.

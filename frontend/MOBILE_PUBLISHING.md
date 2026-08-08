# TactiPlan — Guia de Publicação Mobile (iOS + Android)

Este projeto está preparado pra ser publicado na **App Store** (iOS) e **Google Play** (Android) via **Capacitor** — o React SPA existente é embarcado num shell nativo. Não é reescrita nativa.

---

## Pré-requisitos na sua máquina local

Toda a preparação de código foi feita na VPS. Mas o **build nativo tem que rodar na sua máquina** porque exige:

### iOS
- **macOS** (Xcode só existe em Mac)
- **Xcode 15+** (App Store: Xcode → Preferences → Locations → Command Line Tools)
- **CocoaPods**: `sudo gem install cocoapods`
- **Apple Developer Program**: US$ 99/ano — https://developer.apple.com/programs/

### Android
- **macOS, Linux ou Windows**
- **Android Studio** (última versão) — https://developer.android.com/studio
- **JDK 17+**
- **Google Play Console**: US$ 25 pagamento único — https://play.google.com/console/signup

### Comum
- Node 20+
- Git

---

## Passo a passo (primeira vez)

### 1. Clonar e preparar

```bash
git clone <SEU_REPO_URL> tactiplan
cd tactiplan/frontend
npm install
```

### 2. Adicionar as plataformas nativas

```bash
# Gera pasta ios/ com o projeto Xcode
npm run cap:add:ios

# Gera pasta android/ com o projeto Gradle
npm run cap:add:android
```

Isso cria dois diretórios versionáveis (podem ir pro git). Depois disso, `capacitor.config.json` está linkado nas duas plataformas.

### 3. Gerar todos os ícones e splash automaticamente

```bash
npm install --save-dev @capacitor/assets
npm run cap:assets
```

Isso pega `resources/icon.png` (1024×1024) e `resources/splash.png` (2732×2732) e gera **todos os tamanhos necessários** pras duas plataformas — inclusive adaptive icon do Android e o Contents.json do AppIcon.appiconset do iOS.

Se quiser dark mode splash específico, crie `resources/splash-dark.png` (já preparei um).

### 4. Buildar o web + sincronizar pro nativo

```bash
npm run cap:sync
```

Isso faz `vite build` no React e copia `dist/` pro dentro de `ios/App/App/public` e `android/app/src/main/assets/public`.

Sempre que mexer no código do React, rode `cap:sync` antes de abrir Xcode/Android Studio.

### 5. Abrir cada plataforma

```bash
# iOS: abre no Xcode
npm run cap:open:ios

# Android: abre no Android Studio
npm run cap:open:android
```

---

## iOS — Publicação App Store

### A. Configuração no Xcode (uma vez)

Depois de abrir o projeto no Xcode:

1. **Selecione o projeto `App`** no sidebar → tab **Signing & Capabilities**
2. **Team**: escolha seu Apple Developer Team (o time da conta paga)
3. **Bundle Identifier**: já está `com.faggin.tactiplan` (definido em `capacitor.config.json`). Se quiser mudar (ex.: se você tem um outro domínio), mude aqui **E** no `capacitor.config.json`.
4. **Provisioning Profile**: Xcode gerencia automaticamente (deixe marcado "Automatically manage signing")

### B. Preencher metadata

Ainda no Xcode → tab **General**:
- **Display Name**: TactiPlan
- **Version**: 1.0.0
- **Build**: 1 (incrementa a cada submissão)
- **Deployment Info**:
  - **Minimum iOS**: 14.0 (recomendado)
  - **iPhone / iPad**: marque os dois se quiser universal, ou só iPhone

Em `App/App/Info.plist`, adicione as chaves de **privacy** conforme uso:
- `NSCameraUsageDescription`: "TactiPlan usa a câmera pra você tirar foto do atleta ao cadastrar."
- `NSPhotoLibraryUsageDescription`: "TactiPlan usa sua galeria pra você escolher foto do atleta ao cadastrar."

### C. Privacy manifest (iOS 17+)

Crie `ios/App/App/PrivacyInfo.xcprivacy` (arquivo já preparado no repo — copie de `mobile-templates/PrivacyInfo.xcprivacy` pro caminho iOS antes de submeter).

### D. Ícone

Se `npm run cap:assets` rodou, `ios/App/App/Assets.xcassets/AppIcon.appiconset/` já tem todos os tamanhos. Confira no Xcode → sidebar → Assets.xcassets → AppIcon.

### E. Build de release

```bash
# Xcode: Product → Archive
```

Depois do Archive:
- Window → Organizer → Distribute App → App Store Connect → Upload

### F. App Store Connect (portal)

Em https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**:
- **Platform**: iOS
- **Name**: TactiPlan
- **Primary Language**: Português (Brasil)
- **Bundle ID**: com.faggin.tactiplan (o mesmo)
- **SKU**: tactiplan-ios-001

Preencha metadata:
- **Category (primary)**: Sports
- **Category (secondary)**: Productivity
- **Description**: use o template em `mobile-templates/store-listing-pt-BR.md`
- **Keywords**: futsal, treino, tático, futebol, escalação, plantel, taticaboard, treinador
- **Screenshots**: 6.7" iPhone (obrigatório), 5.5" iPhone (opcional), iPad 13" (se universal)
- **Privacy Policy URL**: https://tactiplan.faggin.com.br/privacidade.html
- **Support URL**: https://tactiplan.faggin.com.br
- **Marketing URL**: https://tactiplan.faggin.com.br

Preencha **App Privacy** (obrigatório): declare dados coletados
- Contact Info (email, name) — Linked to user
- Purchases (subscriptions) — Linked to user
- Identifiers (user ID) — Linked to user
- Photos or Videos (foto de atleta) — Linked to user
- **Não** coletamos: localização, saúde, ID publicidade, contatos, mensagens, etc.

### G. Submeter pra review

- Selecione build (o que subiu via Xcode Archive)
- Preencha Notes for Review (mencione: "Login demo: demo@tactiplan.com / senha: Demo1234" — crie essa conta antes)
- Submit

Review demora **1-3 dias** em média.

---

## Android — Publicação Google Play

### A. Configuração no Android Studio

Depois de `npm run cap:open:android`:

1. **applicationId**: já está em `android/app/build.gradle` como `com.faggin.tactiplan` (Capacitor definiu). Se quiser mudar, mude nos 2 lugares (`build.gradle` + `capacitor.config.json`).
2. **Version**: em `android/app/build.gradle`:
   - `versionCode`: número inteiro incremental (1, 2, 3…)
   - `versionName`: string legível ("1.0.0")

### B. Adaptive icon

`npm run cap:assets` já gera. Confira em `android/app/src/main/res/mipmap-*` (todos os densities).

### C. Permissões

O `AndroidManifest.xml` já vem com o mínimo do Capacitor. Se precisar de câmera, adicione:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

Em `android/app/src/main/AndroidManifest.xml`.

### D. Assinar o app (keystore)

**IMPORTANTE**: guarde o keystore num lugar SEGURO. Se perder, não consegue mais atualizar o app publicado.

```bash
cd android/app
keytool -genkey -v -keystore tactiplan-release.keystore \
        -alias tactiplan -keyalg RSA -keysize 2048 -validity 10000
```

Anote a senha do keystore + senha do alias.

Configure `android/keystore.properties` (NÃO commitar):
```properties
storePassword=SUA_SENHA_KEYSTORE
keyPassword=SUA_SENHA_ALIAS
keyAlias=tactiplan
storeFile=tactiplan-release.keystore
```

E em `android/app/build.gradle`, na seção `android { ... }`:
```gradle
signingConfigs {
    release {
        def keystorePropertiesFile = rootProject.file("keystore.properties")
        def keystoreProperties = new Properties()
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### E. Build de release

```bash
cd android
./gradlew bundleRelease
```

Gera `android/app/build/outputs/bundle/release/app-release.aab` — este é o arquivo que sobe pro Play Console.

### F. Google Play Console (portal)

Em https://play.google.com/console → **Create app**:
- **App name**: TactiPlan
- **Default language**: Português (Brasil)
- **Type**: App
- **Free or Paid**: Free (a monetização é via assinatura interna — se quiser cobrar via Play, vira Paid ou usa in-app billing)

Preencha:
- **Store listing**: use `mobile-templates/store-listing-pt-BR.md`
- **App content**:
  - **Privacy Policy**: https://tactiplan.faggin.com.br/privacidade.html
  - **App access**: se app tem login → forneça credenciais de teste
  - **Ads**: No
  - **Content rating**: preencha questionário (esporte, sem violência, PEGI 3+)
  - **Target audience**: 13+ (adequado ao público treinador)
  - **News app**: No
  - **COVID-19 contact tracing**: No
  - **Data safety**: declare (mesmo tipo do iOS)
- **Main store listing**:
  - App icon (512×512 obrigatório)
  - Feature graphic (1024×500)
  - Screenshots (min. 2 celular, tamanhos 16:9 ou 9:16)
- **App category**: Sports

### G. Testes internos primeiro

Google Play Console → **Testing → Internal testing** → **Create new release**:
- Upload `app-release.aab`
- Adicione testadores (seus e-mails)
- Release

Sua conta vai receber um link pra baixar o app do Play Store como **internal tester**. Isso permite testar antes de publicar pro público.

### H. Produção

Depois de testar, **Production → Create new release** → upload → Rollout to 100%.

Review demora **algumas horas até 3 dias** em média.

---

## Assinatura / In-App Purchase

**Importante**: Apple e Google exigem que assinaturas digitais **dentro do app** passem pelo sistema deles (StoreKit / Google Play Billing) e cobram 15-30% de comissão. Existem 2 caminhos:

### Opção 1 — Web-only paywall (mais comum, evita comissão)
- No app, o botão de assinar leva pra **navegador externo** (Capacitor Browser plugin)
- Usuário completa checkout no site (Mercado Pago) e volta pro app
- Isso é permitido nas duas lojas **desde que o app não mencione "cheaper on web"**
- Já implementado hoje: o BillingPage.jsx dispara `window.location.href` pro Mercado Pago

### Opção 2 — In-App Billing (comissão da loja)
- Configurar produtos na App Store Connect + Play Console
- Usar plugin `@capacitor/purchases` ou `@revenuecat/purchases-capacitor`
- Requer refatorar a rota `/api/billing/checkout` pra validar receitas Apple/Google

**Recomendação**: **Opção 1 no lançamento**. Migre pra Opção 2 se as lojas rejeitarem (raro, mas acontece pra apps focados em consumidor final). Custo Apple/Google só compensa se você já vai vender muito volume.

---

## Deep links (opcional, mas recomendado)

Pra links tipo `https://app.tactiplan.faggin.com.br/#/game/123` abrirem no app quando instalado:

### iOS (Universal Links)
Adicione `apple-app-site-association` na raiz da LP (feito? não). Ver docs Apple.

### Android (App Links)
Adicione `assetlinks.json` em `https://tactiplan.faggin.com.br/.well-known/assetlinks.json`. Ver docs Google.

Isso pode ser feito **depois do primeiro lançamento** — não é bloqueante.

---

## Fluxo recorrente (atualizações)

Depois da primeira publicação, cada atualização é:

```bash
# Muda o código do React normalmente
# Testa no navegador (npm run dev)

# Prepara release
git tag v1.0.1
# Bump versões:
#   iOS:     Xcode → General → Build (incrementa 1)
#   Android: android/app/build.gradle → versionCode++ e versionName

npm run cap:sync
```

Depois:
- iOS: Xcode → Archive → Distribute
- Android: `cd android && ./gradlew bundleRelease` → upload no Play Console

---

## Checklist "tá pronto pra publicar?"

- [ ] `npm run cap:add:ios` rodou → pasta ios/ criada
- [ ] `npm run cap:add:android` rodou → pasta android/ criada
- [ ] `npm run cap:assets` rodou → ícones e splash gerados
- [ ] `capacitor.config.json` com `appId` correto
- [ ] Bundle ID iOS = `com.faggin.tactiplan`
- [ ] applicationId Android = `com.faggin.tactiplan`
- [ ] Keystore Android criado e guardado com segurança (**BACKUP!**)
- [ ] Certificado iOS gerado no portal Apple
- [ ] Screenshots gerados (rode o app no simulador, tire prints)
- [ ] Descrições preenchidas (`mobile-templates/store-listing-pt-BR.md`)
- [ ] Privacy policy publicada em `https://tactiplan.faggin.com.br/privacidade.html` (✓ já)
- [ ] Termos publicados em `https://tactiplan.faggin.com.br/termos.html` (✓ já)
- [ ] Conta de teste criada (`demo@tactiplan.com`) pros reviewers
- [ ] Data Safety / App Privacy preenchidos nos portais

---

## Manutenção do Mercado Pago dentro do app

O checkout do Mercado Pago funciona hoje via `window.location.href` no BillingPage. Dentro do app Capacitor, isso abre o navegador **in-app** por padrão. Pra abrir no navegador do sistema (Safari/Chrome) — evita conflito com Apple Guideline 3.1.1 sobre pagamentos externos —, o BillingPage deve usar o plugin Browser:

```jsx
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

async function startCheckout(planId) {
  const { init_point } = await api.post('/billing/checkout', { plan_id: planId });
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: init_point });
  } else {
    window.location.href = init_point;
  }
}
```

Feito. Isso está no roadmap — não bloqueia primeira submissão, mas recomendado antes de aprovar update.

---

## Suporte

Dúvidas de publicação: verifique docs oficiais.
- Capacitor: https://capacitorjs.com/docs
- Apple: https://developer.apple.com/app-store/review/guidelines/
- Google: https://support.google.com/googleplay/android-developer

Última atualização: agosto/2026.

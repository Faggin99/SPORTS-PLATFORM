# AndroidManifest.xml — permissões e configs adicionais

Depois de `npm run cap:add:android`, edite `android/app/src/main/AndroidManifest.xml` e adicione as permissões abaixo dentro do `<manifest>` (antes de `<application>`):

```xml
<!-- Internet + storage (Capacitor default: já vem) -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Foto do atleta (câmera + galeria) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<!-- Compatibilidade Android < 13 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

<!-- Vibração pro Haptics plugin -->
<uses-permission android:name="android.permission.VIBRATE" />
```

## Deep links (opcional)

Pra que URLs `https://app.tactiplan.faggin.com.br/#/game/...` abram no app quando instalado, adicione dentro da `<activity>` principal:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="app.tactiplan.faggin.com.br" />
</intent-filter>
```

E publique em `https://tactiplan.faggin.com.br/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.faggin.tactiplan",
    "sha256_cert_fingerprints": ["SEU:SHA256:DO:KEYSTORE:AQUI"]
  }
}]
```

O SHA-256 pega com:
```bash
keytool -list -v -keystore android/app/tactiplan-release.keystore -alias tactiplan
```

## Network security config (opcional mas recomendado)

Pra proibir clear-text (força HTTPS), crie `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

E referencie no AndroidManifest.xml `<application>`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

package com.faggin.tactiplan;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Necessário pra o splash Android 12+ (windowSplashScreen*) transicionar
    // corretamente pro tema pós-splash e evitar flash branco.
    SplashScreen.installSplashScreen(this);
    super.onCreate(savedInstanceState);
  }
}

package com.biobramha.dealermithra;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import java.math.BigDecimal;
import java.util.Currency;
import org.json.JSONException;
import org.json.JSONObject;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long backPressedTime = 0;
    private AppEventsLogger logger;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            FacebookSdk.sdkInitialize(getApplicationContext());
            AppEventsLogger.activateApp(getApplication());
            logger = AppEventsLogger.newLogger(this);
        } catch (Exception e) {
            logger = null;
        }

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new MetaEventsBridge(logger), "MetaNativeEvents");
        }
    }

    public static class MetaEventsBridge {
        private final AppEventsLogger appLogger;

        public MetaEventsBridge(AppEventsLogger logger) {
            this.appLogger = logger;
        }

        @JavascriptInterface
        public void logEvent(String eventName, String jsonParams) {
            if (appLogger == null) return;
            android.os.Bundle bundle = new android.os.Bundle();
            try {
                if (jsonParams != null && !jsonParams.isEmpty()) {
                    JSONObject obj = new JSONObject(jsonParams);
                    java.util.Iterator<String> keys = obj.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        bundle.putString(key, obj.getString(key));
                    }
                }
            } catch (JSONException e) {
                // Ignore
            }

            try {
                if (eventName != null && !eventName.isEmpty()) {
                    appLogger.logEvent(eventName, bundle);
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        @JavascriptInterface
        public void logPurchase(double amount, String currency, String jsonParams) {
            if (appLogger == null) return;
            android.os.Bundle bundle = new android.os.Bundle();
            try {
                if (jsonParams != null && !jsonParams.isEmpty()) {
                    JSONObject obj = new JSONObject(jsonParams);
                    java.util.Iterator<String> keys = obj.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        bundle.putString(key, obj.getString(key));
                    }
                }
            } catch (JSONException e) {
                // Ignore
            }
            try {
                appLogger.logPurchase(BigDecimal.valueOf(amount), Currency.getInstance(currency != null ? currency : "INR"), bundle);
            } catch (Exception e) {
                try {
                    appLogger.logPurchase(BigDecimal.valueOf(amount), Currency.getInstance("INR"), bundle);
                } catch (Exception ex) {
                    // Ignore
                }
            }
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_DOWN) {
            if (bridge != null && bridge.getWebView() != null) {
                WebView webView = bridge.getWebView();

                if (webView.canGoBack()) {
                    webView.goBack();
                    return true;
                }

                webView.evaluateJavascript("window.history.back();", null);

                if (backPressedTime + 2000 > System.currentTimeMillis()) {
                    finish();
                } else {
                    backPressedTime = System.currentTimeMillis();
                }
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setLoadsImagesAutomatically(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            if (webView.getTag() == null) {
                webView.addJavascriptInterface(new MetaEventsBridge(logger), "MetaNativeEvents");
                webView.setTag("bridge_added");
            }
        }
    }
}

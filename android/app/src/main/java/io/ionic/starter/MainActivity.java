package io.ionic.starter;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import io.ionic.starter.plugins.AppCheckPlugin;
import io.ionic.starter.plugins.CrashlyticsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppCheckPlugin.class);
        registerPlugin(CrashlyticsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

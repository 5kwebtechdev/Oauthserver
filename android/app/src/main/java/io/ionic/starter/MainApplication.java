package io.ionic.starter;

import android.app.Application;
import android.content.pm.ApplicationInfo;

import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.AppCheckProviderFactory;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

import java.lang.reflect.Method;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();

        FirebaseApp.initializeApp(this);
        FirebaseAppCheck firebaseAppCheck = FirebaseAppCheck.getInstance();

        if (isDebuggable()) {
            AppCheckProviderFactory debugFactory = getDebugAppCheckProviderFactory();
            firebaseAppCheck.installAppCheckProviderFactory(
                debugFactory != null ? debugFactory : PlayIntegrityAppCheckProviderFactory.getInstance()
            );
        } else {
            firebaseAppCheck.installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance());
        }
    }

    private AppCheckProviderFactory getDebugAppCheckProviderFactory() {
        try {
            Class<?> factoryClass = Class.forName("com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory");
            Method getInstance = factoryClass.getMethod("getInstance");
            Object factory = getInstance.invoke(null);
            return (AppCheckProviderFactory) factory;
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isDebuggable() {
        return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }
}

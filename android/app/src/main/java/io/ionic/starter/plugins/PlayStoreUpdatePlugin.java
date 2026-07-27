package io.ionic.starter.plugins;

import android.content.pm.ApplicationInfo;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.InstallException;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Small Capacitor bridge around Google Play's official in-app update API.
 *
 * The web layer owns the branded, non-dismissible UI. This plugin only returns
 * trusted update availability and install-source information; it never scrapes
 * the public Play Store webpage.
 */
@CapacitorPlugin(name = "PlayStoreUpdate")
public class PlayStoreUpdatePlugin extends Plugin {

    private static final String PLAY_STORE_PACKAGE = "com.android.vending";

    @PluginMethod
    public void getUpdateInfo(PluginCall call) {
        JSObject baseResult = createBaseResult();

        try {
            AppUpdateManager manager = AppUpdateManagerFactory.create(getContext());
            manager.getAppUpdateInfo()
                .addOnSuccessListener(info -> resolveUpdateInfo(call, baseResult, info))
                .addOnFailureListener(error -> resolveFailure(call, baseResult, error));
        } catch (Exception error) {
            resolveFailure(call, baseResult, error);
        }
    }

    private void resolveUpdateInfo(PluginCall call, JSObject result, AppUpdateInfo info) {
        int availability = info.updateAvailability();
        boolean updateAvailable =
            availability == UpdateAvailability.UPDATE_AVAILABLE
                || availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;

        result.put("checkSucceeded", true);
        result.put("updateAvailable", updateAvailable);
        result.put("updateAvailability", availability);
        result.put(
            "availableVersionCode",
            updateAvailable ? info.availableVersionCode() : getInstalledVersionCode()
        );
        result.put("updatePriority", updateAvailable ? info.updatePriority() : 0);
        result.put("clientVersionStalenessDays", info.clientVersionStalenessDays());
        call.resolve(result);
    }

    private void resolveFailure(PluginCall call, JSObject result, Exception error) {
        int errorCode = error instanceof InstallException
            ? ((InstallException) error).getErrorCode()
            : 0;

        result.put("checkSucceeded", false);
        result.put("updateAvailable", false);
        result.put("updateAvailability", UpdateAvailability.UNKNOWN);
        result.put("availableVersionCode", getInstalledVersionCode());
        result.put("errorCode", errorCode);
        result.put(
            "errorMessage",
            error.getMessage() == null ? "Google Play update check failed." : error.getMessage()
        );
        call.resolve(result);
    }

    private JSObject createBaseResult() {
        String installerPackage = getInstallerPackageName();
        JSObject result = new JSObject();
        result.put("installedVersionCode", getInstalledVersionCode());
        result.put("installerPackageName", installerPackage);
        result.put("isPlayStoreInstall", PLAY_STORE_PACKAGE.equals(installerPackage));
        result.put("isDebuggable", isDebuggable());
        return result;
    }

    private long getInstalledVersionCode() {
        try {
            PackageInfo packageInfo = getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return packageInfo.getLongVersionCode();
            }
            return packageInfo.versionCode;
        } catch (PackageManager.NameNotFoundException error) {
            return 0;
        }
    }

    private String getInstallerPackageName() {
        PackageManager packageManager = getContext().getPackageManager();
        String packageName = getContext().getPackageName();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InstallSourceInfo sourceInfo = packageManager.getInstallSourceInfo(packageName);
                String installingPackage = sourceInfo.getInstallingPackageName();
                if (installingPackage != null) {
                    return installingPackage;
                }
                String initiatingPackage = sourceInfo.getInitiatingPackageName();
                return initiatingPackage == null ? "" : initiatingPackage;
            }

            @SuppressWarnings("deprecation")
            String installer = packageManager.getInstallerPackageName(packageName);
            return installer == null ? "" : installer;
        } catch (Exception error) {
            return "";
        }
    }

    private boolean isDebuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }
}

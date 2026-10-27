package io.ionic.starter.plugins;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import io.ionic.starter.MainActivity;

@CapacitorPlugin(name = "ActiveTimer")
public class ActiveTimerPlugin extends Plugin {
    @PluginMethod public void setSession(PluginCall call) {
        String title = call.getString("title", "Activity");
        Double end = call.getDouble("endTime", 0.0);
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).setActiveTimer(title, end.longValue());
            call.resolve();
        });
    }
    @PluginMethod public void clearSession(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).setActiveTimer(null, 0);
            call.resolve();
        });
    }
}

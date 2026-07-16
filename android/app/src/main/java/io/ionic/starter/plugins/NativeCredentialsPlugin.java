package io.ionic.starter.plugins;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;

@CapacitorPlugin(name = "NativeCredentials")
public class NativeCredentialsPlugin extends Plugin {
    @PluginMethod
    public void savePassword(PluginCall call) {
        String identifier = call.getString("identifier", "").trim();
        String password = call.getString("password", "");
        if (identifier.isEmpty() || password.isEmpty()) {
            call.reject("Identifier and password are required");
            return;
        }

        CredentialManager credentialManager = CredentialManager.create(getContext());
        CreatePasswordRequest request = new CreatePasswordRequest(identifier, password);
        credentialManager.createCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override
                public void onResult(CreateCredentialResponse result) {
                    JSObject response = new JSObject();
                    response.put("saved", true);
                    call.resolve(response);
                }

                @Override
                public void onError(CreateCredentialException error) {
                    resolveWithoutCredential(call, error.getClass().getSimpleName());
                }
            }
        );
    }

    @PluginMethod
    public void getPassword(PluginCall call) {
        CredentialManager credentialManager = CredentialManager.create(getContext());
        GetPasswordOption passwordOption = new GetPasswordOption(
            Collections.emptySet(),
            false,
            Collections.emptySet()
        );
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(passwordOption)
            .build();

        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    Credential credential = result.getCredential();
                    if (!(credential instanceof PasswordCredential)) {
                        resolveWithoutCredential(call, "UnsupportedCredentialType");
                        return;
                    }

                    PasswordCredential passwordCredential = (PasswordCredential) credential;
                    JSObject response = new JSObject();
                    response.put("identifier", passwordCredential.getId());
                    response.put("password", passwordCredential.getPassword());
                    call.resolve(response);
                }

                @Override
                public void onError(GetCredentialException error) {
                    resolveWithoutCredential(call, error.getClass().getSimpleName());
                }
            }
        );
    }

    private void resolveWithoutCredential(PluginCall call, String reason) {
        JSObject response = new JSObject();
        response.put("saved", false);
        response.put("reason", reason);
        call.resolve(response);
    }
}

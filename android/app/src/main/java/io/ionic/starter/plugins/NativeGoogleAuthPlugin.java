package io.ionic.starter.plugins;

import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Native account picker only. No WebView credential capture or user-agent overrides. */
@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String SERVER_CLIENT_ID = "124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com";
    private volatile boolean busy;
    private CancellationSignal cancellation;
    @PluginMethod public void signIn(PluginCall call) {
        String nonce = call.getString("nonce", "");
        if (!nonce.matches("^[A-Za-z0-9_-]{22,128}$") || !SERVER_CLIENT_ID.equals(call.getString("serverClientId"))) {
            call.reject("Invalid Google sign-in configuration.", "GOOGLE_CONFIGURATION"); return;
        }
        if (busy) { call.reject("Google sign-in is already in progress.", "GOOGLE_BUSY"); return; }
        busy = true;
        getActivity().runOnUiThread(() -> {
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(SERVER_CLIENT_ID).setNonce(nonce).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
                cancellation = new CancellationSignal();
                CredentialManager.create(getContext()).getCredentialAsync(getActivity(), request, cancellation,
                    ContextCompat.getMainExecutor(getContext()), new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse result) {
                            busy = false; cancellation = null;
                            try {
                                Credential credential = result.getCredential();
                                if (!(credential instanceof CustomCredential) || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    call.reject("Google returned an unsupported credential.", "GOOGLE_CREDENTIAL"); return;
                                }
                                String idToken = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                                JSObject response = new JSObject(); response.put("idToken", idToken); call.resolve(response);
                            } catch (Exception error) { call.reject("Google credential could not be read.", "GOOGLE_CREDENTIAL"); }
                        }
                        @Override public void onError(GetCredentialException error) {
                            busy = false; cancellation = null;
                            if (error instanceof GetCredentialCancellationException) call.reject("Google sign-in was cancelled.", "GOOGLE_CANCELLED");
                            else call.reject("Google sign-in could not start. Check Google Play services and try again.", "GOOGLE_UNAVAILABLE");
                        }
                    });
            } catch (Exception error) { busy = false; cancellation = null; call.reject("Google sign-in could not start.", "GOOGLE_UNAVAILABLE"); }
        });
    }
    @Override protected void handleOnDestroy() {
        if (cancellation != null) cancellation.cancel();
        cancellation = null; busy = false;
    }
}

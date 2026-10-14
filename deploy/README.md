# Ubuntu deployment: 187.127.142.16

For automatic deployments on pushes to `Auth2.0` using `/root/Auth2.0`, see
[the CI/CD setup](auth2/README.md) and `.github/workflows/auth2-deploy.yml`.

Local runs use the existing keys under this workspace's `auth-server/keys` folder.
Server runs must activate the `prod` profile to read `/root/privateKey.pem`
(auth-server only) and `/root/publicKey.pem` (both servers):

```bash
java -jar auth-server.jar --spring.profiles.active=prod
java -jar resource-server.jar --spring.profiles.active=prod
```

The production profile also requires the database credentials and frontend settings
listed in the example environment files. Java must have permission to read `/root`.
Explicit key-path environment variables override the profile defaults. The optional
systemd setup below runs as `pkce`, blocks access to `/root`, and overrides the paths
to `/etc/pkce/keys` through its environment files.

Both applications require Java 21. Keys and credentials stay outside the JARs;
copy them before starting the services. They are read at startup, so restart after
changing keys or environment files. No rebuild is needed for those changes.

## Your existing keys in /root

You already have `/root/privateKey.pem` and `/root/publicKey.pem` on the server.
From your development machine in BE, upload the setup script:

```bash
scp deploy/setup-server-keys.sh root@187.127.142.16:/root/
```

Then run at your existing `root@srv1592235` prompt:

```bash
bash /root/setup-server-keys.sh
```

This creates the `pkce` service user and folders, validates that your RSA keys
match, converts the private key to PKCS#8 if necessary, and installs them at the
paths explicitly configured in the example environment files. It also makes your original
private key readable only by root. It never generates a replacement pair and
refuses to overwrite different deployed keys.

For the remaining instructions, use `root` instead of `ubuntu` in SSH/SCP commands.
Skip `useradd` in step 2 and skip uploading/installing keys in step 3, since the
script has already handled them. Continue with Java installation, uploading JARs,
editing environment files, and installing the systemd services.

## 1. Build on your development machine

From the BE folder, with Java 21 installed:

```bash
./mvnw clean package
```

Outputs: `auth-server/target/auth-server.jar` and
`resource-server/target/resource-server.jar`. The build runs the existing tests.
Never include your `.env` or private keys in the uploaded build.

## 2. Prepare Ubuntu

SSH using your real Ubuntu account (replace `ubuntu` if needed):

```bash
ssh ubuntu@187.127.142.16
sudo apt update
sudo apt install openjdk-21-jre-headless
java -version
sudo useradd --system --user-group --home-dir /opt/pkce --shell /usr/sbin/nologin pkce
sudo install -d -o root -g pkce -m 0750 /opt/pkce /etc/pkce /etc/pkce/keys
```

Create the user only once. `/opt/pkce` holds builds; `/etc/pkce/keys` holds PEM
files; `/etc/pkce/auth.env` and `/etc/pkce/resource.env` hold runtime settings.
The service user can read these directories without needing access to your home.

## 3. Upload the builds and your existing matching key pair

Run these commands on your development machine, from BE. Replace key paths with
the actual filenames on your machine:

```bash
ssh ubuntu@187.127.142.16 'mkdir -p ~/pkce-upload && chmod 700 ~/pkce-upload'
scp auth-server/target/auth-server.jar resource-server/target/resource-server.jar ubuntu@187.127.142.16:pkce-upload/
scp deploy/pkce-auth.service deploy/pkce-resource.service deploy/auth.env.example deploy/resource.env.example ubuntu@187.127.142.16:pkce-upload/
scp /path/to/private_key.pem ubuntu@187.127.142.16:pkce-upload/private.pem
scp /path/to/public_key.pem ubuntu@187.127.142.16:pkce-upload/public.pem
```

On Ubuntu:

```bash
sudo install -o root -g pkce -m 0640 ~/pkce-upload/auth-server.jar /opt/pkce/auth-server.jar
sudo install -o root -g pkce -m 0640 ~/pkce-upload/resource-server.jar /opt/pkce/resource-server.jar
sudo install -o root -g pkce -m 0640 ~/pkce-upload/private.pem /etc/pkce/keys/private.pem
sudo install -o root -g pkce -m 0640 ~/pkce-upload/public.pem /etc/pkce/keys/public.pem
sudo install -o root -g root -m 0600 ~/pkce-upload/auth.env.example /etc/pkce/auth.env
sudo install -o root -g root -m 0600 ~/pkce-upload/resource.env.example /etc/pkce/resource.env
sudo nano /etc/pkce/auth.env
sudo nano /etc/pkce/resource.env
```

Replace `CHANGE_ME` database credentials and all frontend URLs. The `:4200`
values are examples; use the port/origin where your frontend actually runs.
Set mail credentials to enable OTP and password-reset email. Use the key ID
associated with your copied pair. Keep the same issuer URL in both files,
including scheme, port, and trailing-slash convention.

The database URLs now specify the full JDBC URL separately for each app.
The examples assume MySQL is on this Ubuntu machine. Change the host if needed.
`mindfullP1` must already contain the SuperMe account schema; create
`pkce_resource` if it does not exist. Use a database account with the permissions
needed for these schemas and Flyway migrations. Back up the shared `mindfullP1`
database before first startup: auth-server runs its Flyway migrations and seeds
its OAuth client even with `SUPERME_WRITES_ENABLED=false`.

The private PEM must be an **unencrypted PKCS#8 RSA key** (`BEGIN PRIVATE KEY`),
and the public PEM must be **X.509/SPKI** (`BEGIN PUBLIC KEY`). Both must belong
to the same pair. The resource server reads only the public file. Do not put
these files in the frontend or a web-served folder.

If you have no keys, generate them ONCE on Ubuntu instead of uploading:

```bash
sudo openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /etc/pkce/keys/private.pem
sudo openssl pkey -in /etc/pkce/keys/private.pem -pubout -out /etc/pkce/keys/public.pem
sudo chown root:pkce /etc/pkce/keys/private.pem /etc/pkce/keys/public.pem
sudo chmod 0640 /etc/pkce/keys/private.pem /etc/pkce/keys/public.pem
```

For a new pair, assign a new unique `JWT_KEY_ID` in `auth.env`. Replacing an
existing pair invalidates tokens signed with the previous pair.

Verify file access without printing key contents:

```bash
sudo -u pkce test -r /etc/pkce/keys/private.pem
sudo -u pkce test -r /etc/pkce/keys/public.pem
```

Each command should exit successfully. Remove the temporary copies of keys and
builds from `~/pkce-upload` after installation.

## 4. Start automatically with systemd

```bash
sudo install -m 0644 ~/pkce-upload/pkce-auth.service /etc/systemd/system/pkce-auth.service
sudo install -m 0644 ~/pkce-upload/pkce-resource.service /etc/systemd/system/pkce-resource.service
sudo systemctl daemon-reload
sudo systemctl enable --now pkce-auth pkce-resource
sudo systemctl status pkce-auth pkce-resource
sudo journalctl -u pkce-auth -n 100 --no-pager
sudo journalctl -u pkce-resource -n 100 --no-pager
curl -f http://127.0.0.1:9000/.well-known/openid-configuration
curl -f http://127.0.0.1:9000/oauth2/jwks
```

External auth URL: `http://187.127.142.16:9000`.
External resource URL: `http://187.127.142.16:9090`.
Protected API endpoints require an access token; an unauthenticated 401 is
expected. Update your frontend's auth/API URLs and rebuild the frontend too.

If UFW is already active, allow the application ports (and permit them in your
hosting provider firewall). Preserve SSH access:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 9000/tcp
sudo ufw allow 9090/tcp
```

These HTTP URLs are for initial connectivity checks. Before sending real login
credentials, configure HTTPS using a TLS reverse proxy and change both issuer
settings and frontend URLs to the public HTTPS addresses. For a proxy setup,
bind the apps to loopback with `SERVER_ADDRESS=127.0.0.1`, set
`SERVER_FORWARD_HEADERS_STRATEGY=framework`, and expose only the proxy ports.

## 5. Future deployments

Rebuild and upload the two JARs, install them into `/opt/pkce` with the commands
above, then restart:

```bash
sudo systemctl restart pkce-auth pkce-resource
sudo systemctl status pkce-auth pkce-resource
```

Keep the key files and environment files across deployments. Missing or invalid
keys cause startup to fail; the app does not wait for keys to be uploaded later.

The OAuth seeder registers a client only if its ID is absent. If the database
already contains `pkce-angular-client` with localhost redirect URIs, changing
environment variables will not update that row. For this new deployment, use a
new `OAUTH_CLIENT_ID` such as `pkce-angular-server-client` and use that same ID in
the frontend, or update the existing registration through your normal database
administration process.

Packaging reference: [Spring Boot executable JAR documentation](https://docs.spring.io/spring-boot/maven-plugin/packaging.html).

package io.ionic.starter.media;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/** Exact aliases for bundled images, never for remote URLs or application routes. */
final class BundledMediaIndex {
    static final class Asset {
        final String path;
        final String mime;
        Asset(String path, String mime) { this.path = path; this.mime = mime; }
    }

    private final URI origin;
    private final Map<String, Asset> entries = new HashMap<>();

    BundledMediaIndex(String localUrl) { origin = URI.create(localUrl); }

    void add(String original, String target, String mime) {
        if (!original.startsWith("/assets/") || original.contains("..") || original.contains("\\")
                || !target.matches("public/_superme-media/[a-f0-9]{64}\\.(webp|png|jpg|jpeg)")) {
            throw new IllegalArgumentException("Invalid bundled media alias");
        }
        if (!mime.matches("image/(webp|png|jpeg)")) throw new IllegalArgumentException("Invalid media MIME type");
        entries.put(original, new Asset(target, mime));
    }

    Asset find(String url, String method) {
        if (!"GET".equals(method)) return null;
        try {
            URI request = URI.create(url);
            if (!origin.getScheme().equalsIgnoreCase(request.getScheme())
                    || !origin.getHost().equalsIgnoreCase(request.getHost())
                    || origin.getPort() != request.getPort() || request.getUserInfo() != null) return null;
            return entries.get(request.getPath());
        } catch (IllegalArgumentException exception) { return null; }
    }
}

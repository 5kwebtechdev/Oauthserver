package io.ionic.starter.media;

import org.junit.Test;
import static org.junit.Assert.*;

public class BundledMediaIndexTest {
    private static final String TARGET = "public/_superme-media/" + "a".repeat(64) + ".webp";

    private BundledMediaIndex index() {
        BundledMediaIndex index = new BundledMediaIndex("https://app.supermeapp.com/");
        index.add("/assets/pet moods/Panda.png", TARGET, "image/webp");
        return index;
    }

    @Test public void originalDynamicUrlResolvesWithSpacesAndCacheQuery() {
        BundledMediaIndex.Asset asset = index().find("https://app.supermeapp.com/assets/pet%20moods/Panda.png?v=1", "GET");
        assertNotNull(asset);
        assertEquals(TARGET, asset.path);
        assertEquals("image/webp", asset.mime);
    }

    @Test public void otherOriginsAndAuthEndpointsNeverResolve() {
        for (String url : new String[] {
                "https://sso.supermeapp.com/assets/pet%20moods/Panda.png",
                "https://auth.supermeapp.com/assets/pet%20moods/Panda.png",
                "https://evil.example/assets/pet%20moods/Panda.png",
                "http://app.supermeapp.com/assets/pet%20moods/Panda.png",
                "https://app.supermeapp.com:444/assets/pet%20moods/Panda.png",
                "https://app.supermeapp.com/oauth2/token",
                "https://app.supermeapp.com/v1/users/1",
                "https://app.supermeapp.com/parent-account",
                "https://evil.example@app.supermeapp.com/assets/pet%20moods/Panda.png"
        }) assertNull(url, index().find(url, "GET"));
    }

    @Test public void postAndUnknownPathsUseExistingServer() {
        assertNull(index().find("https://app.supermeapp.com/assets/pet%20moods/Panda.png", "POST"));
        assertNull(index().find("https://app.supermeapp.com/assets/missing.png", "GET"));
        assertNull(index().find("not a URL", "GET"));
    }

    @Test public void devOriginAndSharedObjectsAreSupported() {
        BundledMediaIndex index = new BundledMediaIndex("https://localhost/");
        index.add("/assets/a.png", TARGET, "image/webp");
        index.add("/assets/b.png", TARGET, "image/webp");
        assertEquals(index.find("https://localhost/assets/a.png", "GET").path,
            index.find("https://localhost/assets/b.png", "GET").path);
        assertNull(index.find("https://app.supermeapp.com/assets/a.png", "GET"));
    }

    @Test(expected = IllegalArgumentException.class) public void traversalCannotEnterManifest() {
        index().add("/assets/../secret", TARGET, "image/webp");
    }

    @Test(expected = IllegalArgumentException.class) public void aliasesCannotServeCode() {
        index().add("/assets/script.png", "public/main.js", "application/javascript");
    }
}

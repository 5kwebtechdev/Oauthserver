package io.ionic.starter;

import org.junit.Test;
import java.util.HashMap;
import java.util.Map;
import static org.junit.Assert.*;

public class BirthdayMessagingServiceTest {
    private Map<String, String> valid() {
        Map<String, String> data = new HashMap<>();
        data.put("type", "BIRTHDAY_SELF");
        data.put("notificationId", "1203");
        data.put("title", "A dynamic title");
        data.put("body", "A dynamic message");
        data.put("actionScreen", "HOME");
        data.put("referenceId", "325");
        return data;
    }
    @Test public void acceptsBothExactTypes() {
        Map<String, String> data = valid();
        assertTrue(BirthdayMessagingService.accepts(data));
        data.put("type", "CHILD_BIRTHDAY_PARENT");
        assertTrue(BirthdayMessagingService.accepts(data));
    }
    @Test public void neverInfersTypeFromDestination() {
        Map<String, String> data = valid();
        data.remove("type");
        assertFalse(BirthdayMessagingService.accepts(data));
        data.put("actionScreen", "PARENT_DASHBOARD");
        assertFalse(BirthdayMessagingService.accepts(data));
        data.put("type", "DAILY_REWARD");
        assertFalse(BirthdayMessagingService.accepts(data));
    }
    @Test public void rejectsIncompleteContract() {
        for (String key : valid().keySet()) {
            Map<String, String> data = valid();
            data.remove(key);
            assertFalse(key, BirthdayMessagingService.accepts(data));
            data.put(key, " ");
            assertFalse(key, BirthdayMessagingService.accepts(data));
        }
    }
}

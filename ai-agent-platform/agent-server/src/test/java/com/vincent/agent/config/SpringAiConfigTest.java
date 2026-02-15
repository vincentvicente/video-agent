package com.vincent.agent.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.ai.chat.model.ChatModel;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SpringAiConfigTest {

    @Autowired
    private ChatModel chatModel;

    @Test
    void chatModelBeanShouldBeLoaded() {
        assertNotNull(chatModel);
    }
}

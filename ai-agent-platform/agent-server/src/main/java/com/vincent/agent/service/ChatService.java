package com.vincent.agent.service;

import com.vincent.agent.mapper.ConversationMapper;
import com.vincent.agent.mapper.MessageMapper;
import com.vincent.agent.model.entity.Conversation;
import com.vincent.agent.model.entity.Message;
import com.vincent.agent.tool.CalculatorTool;
import com.vincent.agent.tool.FileManagerTool;
import com.vincent.agent.tool.WebSearchTool;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatModel chatModel;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final CalculatorTool calculatorTool;
    private final WebSearchTool webSearchTool;
    private final FileManagerTool fileManagerTool;

    public Flux<String> streamChat(Long conversationId, String userMessage) {
        // Ensure conversation exists
        if (conversationId == null) {
            Conversation conv = new Conversation();
            conv.setTitle(userMessage.length() > 50 ? userMessage.substring(0, 50) : userMessage);
            conversationMapper.insert(conv);
            conversationId = conv.getId();
        }

        // Save user message
        Message userMsg = new Message();
        userMsg.setConversationId(conversationId);
        userMsg.setRole("user");
        userMsg.setContent(userMessage);
        messageMapper.insert(userMsg);

        final Long convId = conversationId;
        StringBuilder fullResponse = new StringBuilder();

        return ChatClient.create(chatModel)
                .prompt()
                .user(userMessage)
                .tools(calculatorTool, webSearchTool, fileManagerTool)
                .stream()
                .content()
                .doOnNext(token -> fullResponse.append(token))
                .doOnComplete(() -> {
                    Message assistantMsg = new Message();
                    assistantMsg.setConversationId(convId);
                    assistantMsg.setRole("assistant");
                    assistantMsg.setContent(fullResponse.toString());
                    messageMapper.insert(assistantMsg);
                });
    }
}

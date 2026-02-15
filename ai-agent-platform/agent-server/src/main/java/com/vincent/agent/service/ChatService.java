package com.vincent.agent.service;

import com.vincent.agent.agent.AgentEvent;
import com.vincent.agent.mapper.ConversationMapper;
import com.vincent.agent.mapper.MessageMapper;
import com.vincent.agent.model.entity.Conversation;
import com.vincent.agent.model.entity.Message;
import com.vincent.agent.tool.CalculatorTool;
import com.vincent.agent.tool.FileManagerTool;
import com.vincent.agent.tool.WebSearchTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatModel chatModel;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final CalculatorTool calculatorTool;
    private final WebSearchTool webSearchTool;
    private final FileManagerTool fileManagerTool;

    public Flux<AgentEvent> streamChat(Long conversationId, String userMessage) {
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
        Sinks.Many<AgentEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

        // Emit THINK step
        sink.tryEmitNext(AgentEvent.reactStep("THINK", "Analyzing user query: \"" + userMessage + "\""));

        StringBuilder fullResponse = new StringBuilder();

        ChatClient.create(chatModel)
                .prompt()
                .user(userMessage)
                .tools(calculatorTool, webSearchTool, fileManagerTool)
                .stream()
                .chatResponse()
                .doOnNext(response -> {
                    if (response == null || response.getResult() == null) return;

                    var output = response.getResult().getOutput();

                    // Check for tool calls
                    if (output.getToolCalls() != null && !output.getToolCalls().isEmpty()) {
                        for (var toolCall : output.getToolCalls()) {
                            sink.tryEmitNext(AgentEvent.reactStep("ACT", "Calling tool: " + toolCall.name()));
                            sink.tryEmitNext(AgentEvent.toolStart(toolCall.name(), toolCall.arguments()));
                        }
                    }

                    // Stream text tokens
                    String text = output.getText();
                    if (text != null && !text.isEmpty()) {
                        fullResponse.append(text);
                        sink.tryEmitNext(AgentEvent.token(text));
                    }
                })
                .doOnComplete(() -> {
                    // Emit OBSERVE step with summary
                    if (fullResponse.length() > 0) {
                        String summary = fullResponse.length() > 100
                                ? fullResponse.substring(0, 100) + "..."
                                : fullResponse.toString();
                        sink.tryEmitNext(AgentEvent.reactStep("OBSERVE", "Generated response: " + summary));
                    }

                    // Save assistant message
                    Message assistantMsg = new Message();
                    assistantMsg.setConversationId(convId);
                    assistantMsg.setRole("assistant");
                    assistantMsg.setContent(fullResponse.toString());
                    messageMapper.insert(assistantMsg);

                    sink.tryEmitNext(AgentEvent.done());
                    sink.tryEmitComplete();
                })
                .doOnError(e -> {
                    log.error("Chat stream error", e);
                    sink.tryEmitNext(AgentEvent.error(e.getMessage()));
                    sink.tryEmitComplete();
                })
                .subscribe();

        return sink.asFlux();
    }
}

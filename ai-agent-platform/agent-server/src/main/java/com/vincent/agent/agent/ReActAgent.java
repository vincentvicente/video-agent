package com.vincent.agent.agent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReActAgent {

    private final ChatModel chatModel;

    private static final String REACT_SYSTEM_PROMPT = """
        You are an AI agent that uses the ReAct (Reasoning + Acting) framework.

        For each user query, follow this loop:
        1. THINK: Analyze what you know and what you need to find out.
        2. ACT: If you need more information, call a tool. Specify the tool name and input.
        3. OBSERVE: Review the tool's output and decide if you have enough information.

        Repeat until you can provide a final answer.

        If no tools are needed, respond directly.

        Available tools: {tools}

        Always explain your reasoning step by step.
        """;

    public Flux<AgentEvent> execute(String userQuery) {
        Sinks.Many<AgentEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

        AgentContext context = new AgentContext();
        context.setUserQuery(userQuery);

        // Execute in background, emit events to sink
        Flux.defer(() -> {
            return chatModel.stream(new Prompt(userQuery))
                    .doOnNext(response -> {
                        String text = response.getResult() != null
                                ? response.getResult().getOutput().getText()
                                : "";
                        if (text != null && !text.isEmpty()) {
                            sink.tryEmitNext(AgentEvent.token(text));
                        }
                    })
                    .doOnComplete(() -> {
                        sink.tryEmitNext(AgentEvent.done());
                        sink.tryEmitComplete();
                    })
                    .doOnError(e -> {
                        sink.tryEmitNext(AgentEvent.error(e.getMessage()));
                        sink.tryEmitComplete();
                    });
        }).subscribe();

        return sink.asFlux();
    }
}

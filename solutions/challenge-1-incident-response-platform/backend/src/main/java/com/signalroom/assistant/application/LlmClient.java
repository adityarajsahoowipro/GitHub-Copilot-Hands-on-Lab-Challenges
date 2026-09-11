package com.signalroom.assistant.application;

public interface LlmClient {
    String answer(String systemPrompt, String userPrompt);
}

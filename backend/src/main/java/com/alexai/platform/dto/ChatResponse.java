package com.alexai.platform.dto;

import java.util.List;

public class ChatResponse {

    private String agent;
    private String response;
    private String systemPrompt;
    private List<String> ragDetails;

    public ChatResponse(
            String agent,
            String response,
            String systemPrompt,
            List<String> ragDetails
    ){

        this.agent = agent;
        this.response = response;
        this.systemPrompt = systemPrompt;
        this.ragDetails = ragDetails;

    }

    public String getAgent(){
        return agent;
    }

    public String getResponse(){
        return response;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public List<String> getRagDetails() {
        return ragDetails;
    }

}

package com.alexai.platform.dto;

public class ChatRequest {

    private String agent;
    private String message;
    private String email;


    public String getAgent() {
        return agent;
    }


    public void setAgent(String agent) {
        this.agent = agent;
    }


    public String getMessage() {
        return message;
    }


    public void setMessage(String message) {
        this.message = message;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

}

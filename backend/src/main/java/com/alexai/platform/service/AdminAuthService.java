package com.alexai.platform.service;

import org.springframework.stereotype.Service;

/**
 * Serviço para centralizar a lógica de autenticação e verificação de privilégios
 * administrativos (Operadores).
 */
@Service
public class AdminAuthService {

    /**
     * Lista de e-mails de administradores autorizados.
     * Configurável via variável de ambiente ADMIN_EMAILS (separados por vírgula).
     */
    public String[] getAdminEmails() {
        String emails = System.getenv().getOrDefault("ADMIN_EMAILS", "");
        if (emails.isEmpty()) {
            return new String[0];
        }
        return emails.split(",");
    }

    /**
     * Verifica se o e-mail informado possui privilégios de administrador.
     */
    public boolean isAdmin(String email) {
        if (email == null || email.isBlank()) return false;
        String[] admins = getAdminEmails();

        if (admins.length == 0) return false;

        for (String admin : admins) {
            if (admin.trim().equalsIgnoreCase(email.trim())) {
                return true;
            }
        }
        return false;
    }
}

package com.alexai.platform.service;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;

/**
 * Serviço para centralizar a lógica de autenticação e verificação de privilégios
 * administrativos (Operadores).
 */
@Service
public class AdminAuthService {

    private static final List<String> DEFAULT_ADMINS = List.of(
        "asizaguirre@gmail.com",
        "arquitetossti@gmail.com",
        "gustavoduarte.21233@gmail.com",
        "jgabiiz@gmail.com"
    );

    /**
     * Lista de e-mails de administradores autorizados.
     * Configurável via variável de ambiente ADMIN_EMAILS (separados por vírgula ou ponto e vírgula).
     */
    public String[] getAdminEmails() {
        String emails = System.getenv().getOrDefault("ADMIN_EMAILS", "");
        if (emails.isBlank()) {
            return DEFAULT_ADMINS.toArray(new String[0]);
        }
        return Arrays.stream(emails.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    /**
     * Verifica se o e-mail informado possui privilégios de administrador.
     */
    public boolean isAdmin(String email) {
        if (email == null || email.isBlank()) return false;
        String cleanEmail = email.trim().toLowerCase();

        for (String admin : getAdminEmails()) {
            if (admin.equalsIgnoreCase(cleanEmail)) {
                return true;
            }
        }
        return DEFAULT_ADMINS.stream().anyMatch(admin -> admin.equalsIgnoreCase(cleanEmail));
    }
}

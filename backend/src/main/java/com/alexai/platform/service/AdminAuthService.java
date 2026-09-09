package com.alexai.platform.service;

import org.springframework.stereotype.Service;
import java.util.List;

/**
 * Serviço para centralizar a lógica de autenticação e verificação de privilégios
 * administrativos (Operadores). Os demais usuários são clientes gerenciados
 * pelo UserAccessService.
 */
@Service
public class AdminAuthService {

    private static final List<String> DEFAULT_ADMINS = List.of("asizaguirre@gmail.com");

    /** Lista fixa de e-mails com privilégios de administrador. */
    public String[] getAdminEmails() {
        return DEFAULT_ADMINS.toArray(new String[0]);
    }

    /**
     * Verifica se o e-mail informado possui privilégios de administrador.
     */
    public boolean isAdmin(String email) {
        if (email == null || email.isBlank()) return false;
        String cleanEmail = email.trim().toLowerCase();

        return DEFAULT_ADMINS.stream().anyMatch(admin -> admin.equalsIgnoreCase(cleanEmail));
    }
}

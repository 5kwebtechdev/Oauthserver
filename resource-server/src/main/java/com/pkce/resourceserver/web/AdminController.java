package com.pkce.resourceserver.web;

import com.pkce.resourceserver.dto.NoteResponse;
import com.pkce.resourceserver.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Demonstrates role-based access control distinct from the scope-based checks on
 * NotesController - same underlying resource, gated by ROLE_ADMIN instead of a scope.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final NoteRepository noteRepository;

    @GetMapping("/notes")
    public List<NoteResponse> listAllNotes() {
        return noteRepository.findAll().stream()
                .map(NoteResponse::from)
                .toList();
    }
}

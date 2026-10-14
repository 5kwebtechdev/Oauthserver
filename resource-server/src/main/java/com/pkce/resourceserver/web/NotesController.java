package com.pkce.resourceserver.web;

import com.pkce.resourceserver.dto.NoteRequest;
import com.pkce.resourceserver.dto.NoteResponse;
import com.pkce.resourceserver.entity.Note;
import com.pkce.resourceserver.repository.NoteRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NotesController {

    private final NoteRepository noteRepository;

    @GetMapping
    public List<NoteResponse> listMyNotes(JwtAuthenticationToken authentication) {
        String owner = authentication.getToken().getSubject();
        return noteRepository.findByOwnerUsername(owner).stream()
                .map(NoteResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<NoteResponse> createNote(JwtAuthenticationToken authentication,
                                                     @Valid @RequestBody NoteRequest request) {
        Note note = new Note();
        note.setOwnerUsername(authentication.getToken().getSubject());
        note.setTitle(request.title());
        note.setContent(request.content());
        Note saved = noteRepository.save(note);
        return ResponseEntity.status(HttpStatus.CREATED).body(NoteResponse.from(saved));
    }
}

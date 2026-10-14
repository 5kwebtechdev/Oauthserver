package com.pkce.resourceserver.dto;

import com.pkce.resourceserver.entity.Note;

import java.time.LocalDateTime;

public record NoteResponse(Long id, String ownerUsername, String title, String content, LocalDateTime createdAt) {
    public static NoteResponse from(Note note) {
        return new NoteResponse(note.getId(), note.getOwnerUsername(), note.getTitle(), note.getContent(), note.getCreatedAt());
    }
}

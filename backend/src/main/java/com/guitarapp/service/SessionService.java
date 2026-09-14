package com.guitarapp.service;

import com.guitarapp.dto.SessionResponseDto;
import com.guitarapp.dto.SessionStateDto;
import com.guitarapp.exception.SessionException;
import com.guitarapp.model.SavedSession;
import com.guitarapp.model.User;
import com.guitarapp.repository.SavedSessionRepository;
import com.guitarapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Saved-session persistence for premium users. Premium enforcement lives at the controller
 * ({@code @PreAuthorize("hasRole('PREMIUM')")}); this service assumes an already-authorized
 * caller and scopes all operations to {@code userId}. One row per user (upsert) — see
 * Story 4.4 Dev Notes for why this isn't a history table.
 */
@Service
public class SessionService {

    private final SavedSessionRepository savedSessionRepository;
    private final UserRepository userRepository;

    public SessionService(SavedSessionRepository savedSessionRepository, UserRepository userRepository) {
        this.savedSessionRepository = savedSessionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SessionResponseDto upsert(Long userId, SessionStateDto state) {
        SavedSession session = savedSessionRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // getReferenceById associates the FK without loading the full User row.
                    User user = userRepository.getReferenceById(userId);
                    return SavedSession.builder().user(user).build();
                });
        session.setState(state);
        return SessionResponseDto.from(savedSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public Optional<SessionResponseDto> getForUser(Long userId) {
        return savedSessionRepository.findByUserId(userId).map(SessionResponseDto::from);
    }

    @Transactional
    public void delete(Long userId, Long sessionId) {
        SavedSession session = savedSessionRepository.findById(sessionId)
                .orElseThrow(SessionException::notFound);

        // Ownership verification
        if (!session.getUser().getId().equals(userId)) {
            throw SessionException.accessDenied();
        }

        savedSessionRepository.deleteById(sessionId);
    }
}

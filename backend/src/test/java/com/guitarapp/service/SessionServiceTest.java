package com.guitarapp.service;

import com.guitarapp.dto.FreeformMarkDto;
import com.guitarapp.dto.SessionResponseDto;
import com.guitarapp.dto.SessionStateDto;
import com.guitarapp.exception.SessionException;
import com.guitarapp.model.SavedSession;
import com.guitarapp.model.User;
import com.guitarapp.repository.SavedSessionRepository;
import com.guitarapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pure unit test (no Spring context) — mocks the repository interfaces (Java 25 mock-safe).
 */
class SessionServiceTest {

    private SavedSessionRepository savedSessionRepository;
    private UserRepository userRepository;
    private SessionService service;

    private static final SessionStateDto STATE = new SessionStateDto(
            "Standard E", 2, List.of(new FreeformMarkDto(3, 1)));

    @BeforeEach
    void setUp() {
        savedSessionRepository = mock(SavedSessionRepository.class);
        userRepository = mock(UserRepository.class);
        service = new SessionService(savedSessionRepository, userRepository);
    }

    @Test
    void upsert_createsNewRowWhenNoneExists() {
        when(savedSessionRepository.findByUserId(1L)).thenReturn(Optional.empty());
        User user = User.builder().id(1L).build();
        when(userRepository.getReferenceById(1L)).thenReturn(user);
        when(savedSessionRepository.save(any(SavedSession.class))).thenAnswer(inv -> {
            SavedSession s = inv.getArgument(0);
            return SavedSession.builder()
                    .id(10L)
                    .user(s.getUser())
                    .state(s.getState())
                    .updatedAt(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();
        });

        SessionResponseDto dto = service.upsert(1L, STATE);

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.state().tuning()).isEqualTo("Standard E");
        assertThat(dto.state().capoPosition()).isEqualTo(2);
        assertThat(dto.state().freeformMarks()).containsExactly(new FreeformMarkDto(3, 1));
        assertThat(dto.updatedAt()).isNotNull();
    }

    @Test
    void upsert_updatesExistingRowRatherThanCreatingANewOne() {
        User user = User.builder().id(1L).build();
        SavedSession existing = SavedSession.builder()
                .id(10L)
                .user(user)
                .state(new SessionStateDto("Drop D", 0, List.of()))
                .updatedAt(OffsetDateTime.now(ZoneOffset.UTC).minusDays(1))
                .build();
        when(savedSessionRepository.findByUserId(1L)).thenReturn(Optional.of(existing));
        when(savedSessionRepository.save(any(SavedSession.class))).thenAnswer(inv -> inv.getArgument(0));

        SessionResponseDto dto = service.upsert(1L, STATE);

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.state().tuning()).isEqualTo("Standard E");
        verify(userRepository, never()).getReferenceById(any());
        verify(savedSessionRepository, never()).save(argThat(s -> !s.getId().equals(10L)));
    }

    @Test
    void getForUser_returnsMappedDtoWhenSessionExists() {
        User user = User.builder().id(1L).build();
        SavedSession existing = SavedSession.builder()
                .id(10L).user(user).state(STATE)
                .updatedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(savedSessionRepository.findByUserId(1L)).thenReturn(Optional.of(existing));

        Optional<SessionResponseDto> dto = service.getForUser(1L);

        assertThat(dto).isPresent();
        assertThat(dto.get().state().tuning()).isEqualTo("Standard E");
    }

    @Test
    void getForUser_emptyWhenNoSessionSaved() {
        when(savedSessionRepository.findByUserId(2L)).thenReturn(Optional.empty());
        assertThat(service.getForUser(2L)).isEmpty();
    }

    @Test
    void delete_ownerCanDelete() {
        User user = User.builder().id(1L).build();
        SavedSession session = SavedSession.builder().id(10L).user(user).state(STATE).build();
        when(savedSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        service.delete(1L, 10L);

        verify(savedSessionRepository).deleteById(10L);
    }

    @Test
    void delete_nonOwnerThrowsAccessDenied() {
        User otherUser = User.builder().id(99L).build();
        SavedSession session = SavedSession.builder().id(10L).user(otherUser).state(STATE).build();
        when(savedSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.delete(1L, 10L))
                .isInstanceOf(SessionException.class)
                .satisfies(ex -> assertThat(((SessionException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    void delete_nonexistentSessionThrowsNotFound() {
        when(savedSessionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(1L, 999L))
                .isInstanceOf(SessionException.class)
                .satisfies(ex -> assertThat(((SessionException) ex).getCode()).isEqualTo("NOT_FOUND"));
    }
}

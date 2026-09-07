package com.guitarapp.service;

import com.guitarapp.dto.TuningRequestDto;
import com.guitarapp.dto.TuningResponseDto;
import com.guitarapp.exception.TuningException;
import com.guitarapp.model.CustomTuning;
import com.guitarapp.model.User;
import com.guitarapp.repository.CustomTuningRepository;
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
class TuningServiceTest {

    private CustomTuningRepository customTuningRepository;
    private UserRepository userRepository;
    private TuningService service;

    private static final List<String> STANDARD = List.of("E2", "A2", "D3", "G3", "B3", "E4");

    @BeforeEach
    void setUp() {
        customTuningRepository = mock(CustomTuningRepository.class);
        userRepository = mock(UserRepository.class);
        service = new TuningService(customTuningRepository, userRepository);
    }

    @Test
    void create_associatesUserAndMapsDto() {
        User user = User.builder().id(1L).build();
        when(userRepository.getReferenceById(1L)).thenReturn(user);
        when(customTuningRepository.save(any(CustomTuning.class))).thenAnswer(inv -> {
            CustomTuning t = inv.getArgument(0);
            return CustomTuning.builder()
                    .id(10L)
                    .user(t.getUser())
                    .name(t.getName())
                    .strings(t.getStrings())
                    .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();
        });

        TuningResponseDto dto = service.create(1L, new TuningRequestDto("Drop C", List.of("C2", "G2", "C3", "F3", "A3", "D4")));

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.name()).isEqualTo("Drop C");
        assertThat(dto.strings()).containsExactly("C2", "G2", "C3", "F3", "A3", "D4");
        assertThat(dto.createdAt()).isNotNull();
    }

    @Test
    void listForUser_returnsOnlyMappedDtos() {
        CustomTuning t = CustomTuning.builder()
                .id(5L)
                .name("My Tuning")
                .strings(STANDARD)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(t));

        List<TuningResponseDto> dtos = service.listForUser(1L);

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).id()).isEqualTo(5L);
        assertThat(dtos.get(0).name()).isEqualTo("My Tuning");
        assertThat(dtos.get(0).strings()).containsExactlyElementsOf(STANDARD);
    }

    @Test
    void listForUser_emptyWhenNoTunings() {
        when(customTuningRepository.findByUserIdOrderByCreatedAtAsc(2L)).thenReturn(List.of());
        assertThat(service.listForUser(2L)).isEmpty();
    }

    @Test
    void update_ownerCanUpdateName() {
        User user = User.builder().id(1L).build();
        CustomTuning existing = CustomTuning.builder()
                .id(5L)
                .user(user)
                .name("Drop C")
                .strings(List.of("C2", "G2", "C3", "F3", "A3", "D4"))
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(customTuningRepository.save(any(CustomTuning.class))).thenAnswer(inv -> inv.getArgument(0));

        TuningResponseDto updated = service.update(1L, 5L, new TuningRequestDto("Open D", List.of("D2", "A2", "D3", "F#3", "A3", "D4")));

        assertThat(updated.id()).isEqualTo(5L);
        assertThat(updated.name()).isEqualTo("Open D");
        assertThat(updated.strings()).containsExactly("D2", "A2", "D3", "F#3", "A3", "D4");
    }

    @Test
    void update_nonOwnerThrowsAccessDenied() {
        User otherUser = User.builder().id(99L).build();
        CustomTuning tuning = CustomTuning.builder()
                .id(5L)
                .user(otherUser)
                .name("Drop C")
                .strings(STANDARD)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(Optional.of(tuning));

        assertThatThrownBy(() -> service.update(1L, 5L, new TuningRequestDto("Open D", STANDARD)))
                .isInstanceOf(TuningException.class)
                .satisfies(ex -> assertThat(((TuningException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    void update_nonexistentTuningThrowsNotFound() {
        when(customTuningRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(1L, 999L, new TuningRequestDto("Open D", STANDARD)))
                .isInstanceOf(TuningException.class)
                .satisfies(ex -> assertThat(((TuningException) ex).getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test
    void delete_ownerCanDelete() {
        User user = User.builder().id(1L).build();
        CustomTuning tuning = CustomTuning.builder()
                .id(5L)
                .user(user)
                .name("Drop C")
                .strings(STANDARD)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(Optional.of(tuning));

        service.delete(1L, 5L);

        verify(customTuningRepository).deleteById(5L);
    }

    @Test
    void delete_nonOwnerThrowsAccessDenied() {
        User otherUser = User.builder().id(99L).build();
        CustomTuning tuning = CustomTuning.builder()
                .id(5L)
                .user(otherUser)
                .name("Drop C")
                .strings(STANDARD)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(Optional.of(tuning));

        assertThatThrownBy(() -> service.delete(1L, 5L))
                .isInstanceOf(TuningException.class)
                .satisfies(ex -> assertThat(((TuningException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    void delete_nonexistentTuningThrowsNotFound() {
        when(customTuningRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(1L, 999L))
                .isInstanceOf(TuningException.class)
                .satisfies(ex -> assertThat(((TuningException) ex).getCode()).isEqualTo("NOT_FOUND"));
    }
}

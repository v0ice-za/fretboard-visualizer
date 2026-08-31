package com.guitarapp.service;

import com.guitarapp.dto.TuningRequestDto;
import com.guitarapp.dto.TuningResponseDto;
import com.guitarapp.model.CustomTuning;
import com.guitarapp.model.User;
import com.guitarapp.repository.CustomTuningRepository;
import com.guitarapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
}

package com.guitarapp.service;

import com.guitarapp.dto.TuningRequestDto;
import com.guitarapp.dto.TuningResponseDto;
import com.guitarapp.model.CustomTuning;
import com.guitarapp.model.User;
import com.guitarapp.repository.CustomTuningRepository;
import com.guitarapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Custom-tuning persistence for premium users. Premium enforcement lives at the controller
 * ({@code @PreAuthorize("hasRole('PREMIUM')")}); this service assumes an already-authorized
 * caller and only owns the create/list logic scoped to {@code userId}.
 */
@Service
public class TuningService {

    private final CustomTuningRepository customTuningRepository;
    private final UserRepository userRepository;

    public TuningService(CustomTuningRepository customTuningRepository, UserRepository userRepository) {
        this.customTuningRepository = customTuningRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TuningResponseDto create(Long userId, TuningRequestDto request) {
        // getReferenceById associates the FK without loading the full User row.
        User user = userRepository.getReferenceById(userId);
        CustomTuning tuning = CustomTuning.builder()
                .user(user)
                .name(request.name())
                .strings(List.copyOf(request.strings()))
                .build();
        return TuningResponseDto.from(customTuningRepository.save(tuning));
    }

    @Transactional(readOnly = true)
    public List<TuningResponseDto> listForUser(Long userId) {
        return customTuningRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(TuningResponseDto::from)
                .toList();
    }
}

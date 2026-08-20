package com.fixmate.service;

import com.fixmate.dto.UpdateProfileRequest;
import com.fixmate.dto.UserProfileDto;
import com.fixmate.entity.User;
import com.fixmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserProfileDto getUserProfile(User currentUser) {
        return UserProfileDto.builder()
                .id(currentUser.getId())
                .firstName(currentUser.getFirstName())
                .lastName(currentUser.getLastName())
                .email(currentUser.getEmail())
                .phone(currentUser.getPhone())
                .role(currentUser.getRole())
                .build();
    }

    public UserProfileDto updateUserProfile(User currentUser, UpdateProfileRequest request) {
        currentUser.setFirstName(request.getFirstName());
        currentUser.setLastName(request.getLastName());
        currentUser.setPhone(request.getPhone());
        
        User updatedUser = userRepository.save(currentUser);
        
        return UserProfileDto.builder()
                .id(updatedUser.getId())
                .firstName(updatedUser.getFirstName())
                .lastName(updatedUser.getLastName())
                .email(updatedUser.getEmail())
                .phone(updatedUser.getPhone())
                .role(updatedUser.getRole())
                .build();
    }
}

package com.fixmate.service;

import com.fixmate.dto.CategoryDto;
import com.fixmate.dto.CategoryRequest;
import com.fixmate.entity.ServiceCategory;
import com.fixmate.entity.User;
import com.fixmate.enums.Role;
import com.fixmate.repository.ServiceCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final ServiceCategoryRepository categoryRepository;

    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public CategoryDto createCategory(User admin, CategoryRequest request) {
        verifyAdminRole(admin);

        ServiceCategory category = ServiceCategory.builder()
                .name(request.getName())
                .description(request.getDescription())
                .iconUrl(request.getIconUrl())
                .isActive(request.isActive())
                .build();

        ServiceCategory savedCategory = categoryRepository.save(category);
        return mapToDto(savedCategory);
    }

    public CategoryDto updateCategory(Long id, User admin, CategoryRequest request) {
        verifyAdminRole(admin);

        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setIconUrl(request.getIconUrl());
        category.setActive(request.isActive());

        ServiceCategory updatedCategory = categoryRepository.save(category);
        return mapToDto(updatedCategory);
    }

    public void deleteCategory(Long id, User admin) {
        verifyAdminRole(admin);

        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        categoryRepository.delete(category);
    }

    private void verifyAdminRole(User user) {
        if (user.getRole() != Role.ROLE_ADMIN) {
            throw new RuntimeException("Access denied: Only Admins can modify categories.");
        }
    }

    private CategoryDto mapToDto(ServiceCategory category) {
        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .iconUrl(category.getIconUrl())
                .isActive(category.isActive())
                .build();
    }
}

package com.fixmate.controller;

import com.fixmate.dto.CategoryDto;
import com.fixmate.dto.CategoryRequest;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryDto>>> getAllCategories() {
        List<CategoryDto> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success("Categories fetched successfully", categories));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryDto>> createCategory(
            @AuthenticationPrincipal User admin,
            @RequestBody CategoryRequest request
    ) {
        CategoryDto category = categoryService.createCategory(admin, request);
        return ResponseEntity.ok(ApiResponse.success("Category created successfully", category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryDto>> updateCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            @RequestBody CategoryRequest request
    ) {
        CategoryDto category = categoryService.updateCategory(id, admin, request);
        return ResponseEntity.ok(ApiResponse.success("Category updated successfully", category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin
    ) {
        categoryService.deleteCategory(id, admin);
        return ResponseEntity.ok(ApiResponse.success("Category deleted successfully", null));
    }
}

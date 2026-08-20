package com.fixmate.controller;

import com.fixmate.dto.WarrantyRequestDto;
import com.fixmate.dto.WarrantyResponseDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.WarrantyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/warranties")
@RequiredArgsConstructor
public class WarrantyController {

    private final WarrantyService warrantyService;

    @PostMapping
    public ResponseEntity<ApiResponse<WarrantyResponseDto>> addWarranty(
            @AuthenticationPrincipal User customer,
            @RequestBody WarrantyRequestDto request
    ) {
        WarrantyResponseDto warranty = warrantyService.addWarranty(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Item added to Warranty Locker successfully", warranty));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WarrantyResponseDto>>> getCustomerWarranties(
            @AuthenticationPrincipal User customer
    ) {
        List<WarrantyResponseDto> warranties = warrantyService.getCustomerWarranties(customer);
        return ResponseEntity.ok(ApiResponse.success("Warranty Locker fetched successfully", warranties));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteWarranty(
            @AuthenticationPrincipal User customer,
            @PathVariable Long id
    ) {
        warrantyService.deleteWarranty(id, customer);
        return ResponseEntity.ok(ApiResponse.success("Item removed from Warranty Locker", null));
    }
}

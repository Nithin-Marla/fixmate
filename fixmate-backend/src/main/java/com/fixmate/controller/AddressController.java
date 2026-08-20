package com.fixmate.controller;

import com.fixmate.dto.AddressDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @PostMapping
    public ResponseEntity<ApiResponse<AddressDto>> addAddress(
            @AuthenticationPrincipal User currentUser,
            @RequestBody AddressDto request
    ) {
        AddressDto savedAddress = addressService.addAddress(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("Address added successfully", savedAddress));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AddressDto>>> getUserAddresses(
            @AuthenticationPrincipal User currentUser
    ) {
        List<AddressDto> addresses = addressService.getUserAddresses(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Addresses fetched successfully", addresses));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressDto>> updateAddress(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser,
            @RequestBody AddressDto request
    ) {
        AddressDto updatedAddress = addressService.updateAddress(id, currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("Address updated successfully", updatedAddress));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        addressService.deleteAddress(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Address deleted successfully", null));
    }
}

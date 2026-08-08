package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WarrantyRequestDto {
    private String itemName;
    private LocalDate purchaseDate;
    private LocalDate warrantyExpiryDate;
    private String documentUrl;
    private String notes;
}

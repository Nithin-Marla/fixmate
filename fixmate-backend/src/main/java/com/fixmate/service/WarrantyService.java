package com.fixmate.service;

import com.fixmate.dto.WarrantyRequestDto;
import com.fixmate.dto.WarrantyResponseDto;
import com.fixmate.entity.User;
import com.fixmate.entity.Warranty;
import com.fixmate.enums.Role;
import com.fixmate.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WarrantyService {

    private final WarrantyRepository warrantyRepository;

    public WarrantyResponseDto addWarranty(User customer, WarrantyRequestDto request) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can use the Warranty Locker.");
        }

        Warranty warranty = Warranty.builder()
                .customer(customer)
                .itemName(request.getItemName())
                .purchaseDate(request.getPurchaseDate())
                .warrantyExpiryDate(request.getWarrantyExpiryDate())
                .documentUrl(request.getDocumentUrl())
                .notes(request.getNotes())
                .build();

        Warranty savedWarranty = warrantyRepository.save(warranty);
        return mapToDto(savedWarranty);
    }

    public List<WarrantyResponseDto> getCustomerWarranties(User customer) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can view the Warranty Locker.");
        }

        return warrantyRepository.findByCustomer(customer).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public void deleteWarranty(Long warrantyId, User customer) {
        Warranty warranty = warrantyRepository.findById(warrantyId)
                .orElseThrow(() -> new RuntimeException("Warranty not found."));

        if (!warranty.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("You can only delete your own warranties.");
        }

        warrantyRepository.delete(warranty);
    }

    private WarrantyResponseDto mapToDto(Warranty warranty) {
        return WarrantyResponseDto.builder()
                .id(warranty.getId())
                .itemName(warranty.getItemName())
                .purchaseDate(warranty.getPurchaseDate())
                .warrantyExpiryDate(warranty.getWarrantyExpiryDate())
                .documentUrl(warranty.getDocumentUrl())
                .notes(warranty.getNotes())
                .build();
    }
}

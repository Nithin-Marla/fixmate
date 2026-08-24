package com.fixmate.service;

import com.fixmate.dto.AddressDto;
import com.fixmate.entity.Address;
import com.fixmate.entity.User;
import com.fixmate.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;

    public AddressDto addAddress(User currentUser, AddressDto request) {
        if (request.isDefault()) {
            resetDefaultAddresses(currentUser);
        }

        Address address = Address.builder()
                .buildingName(request.getBuildingName())
                .street(request.getStreet())
                .city(request.getCity())
                .state(request.getState())
                .zipCode(request.getZipCode())
                .country(request.getCountry())
                .isDefault(request.isDefault())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .user(currentUser)
                .build();

        Address savedAddress = addressRepository.save(address);
        return mapToDto(savedAddress);
    }

    public List<AddressDto> getUserAddresses(User currentUser) {
        return addressRepository.findByUserAndIsDeletedFalse(currentUser)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public AddressDto updateAddress(Long addressId, User currentUser, AddressDto request) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Address not found"));

        if (!address.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized to update this address");
        }

        if (request.isDefault() && !address.isDefault()) {
            resetDefaultAddresses(currentUser);
        }

        address.setBuildingName(request.getBuildingName());
        address.setStreet(request.getStreet());
        address.setCity(request.getCity());
        address.setState(request.getState());
        address.setZipCode(request.getZipCode());
        address.setCountry(request.getCountry());
        address.setDefault(request.isDefault());
        address.setLatitude(request.getLatitude());
        address.setLongitude(request.getLongitude());

        Address updatedAddress = addressRepository.save(address);
        return mapToDto(updatedAddress);
    }

    public void deleteAddress(Long addressId, User currentUser) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Address not found"));

        if (!address.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized to delete this address");
        }
        address.setDeleted(true);
        address.setDefault(false);
        addressRepository.save(address);
    }

    private void resetDefaultAddresses(User currentUser) {
        List<Address> addresses = addressRepository.findByUserAndIsDeletedFalse(currentUser);
        for (Address addr : addresses) {
            if (addr.isDefault()) {
                addr.setDefault(false);
                addressRepository.save(addr);
            }
        }
    }

    private AddressDto mapToDto(Address address) {
        return AddressDto.builder()
                .id(address.getId())
                .buildingName(address.getBuildingName())
                .street(address.getStreet())
                .city(address.getCity())
                .state(address.getState())
                .zipCode(address.getZipCode())
                .country(address.getCountry())
                .isDefault(address.isDefault())
                .latitude(address.getLatitude())
                .longitude(address.getLongitude())
                .build();
    }
}

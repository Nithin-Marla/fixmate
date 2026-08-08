package com.fixmate.controller;

import com.fixmate.dto.PartnerSearchResultDto;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/partners")
    public ResponseEntity<ApiResponse<List<PartnerSearchResultDto>>> searchPartners(
            @RequestParam String skill
    ) {
        List<PartnerSearchResultDto> partners = searchService.searchAvailablePartners(skill);
        return ResponseEntity.ok(ApiResponse.success("Partners fetched successfully", partners));
    }
}

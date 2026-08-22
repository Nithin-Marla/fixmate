package com.fixmate.service;

import com.fixmate.entity.AuditLog;
import com.fixmate.entity.User;
import com.fixmate.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(String action, String entityType, Long entityId, String description, User actor) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .actor(actor)
                .build();
        auditLogRepository.save(log);
    }

    public Page<AuditLog> getRecentLogs(int page, int size) {
        return auditLogRepository.findAllByOrderByTimestampDesc(PageRequest.of(page, size));
    }

    public Page<AuditLog> searchLogs(String action, int page, int size) {
        return auditLogRepository.findByActionContainingIgnoreCaseOrderByTimestampDesc(
                action, PageRequest.of(page, size));
    }
}

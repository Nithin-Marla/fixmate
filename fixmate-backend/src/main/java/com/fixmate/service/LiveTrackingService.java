package com.fixmate.service;

import com.fixmate.dto.LiveTrackingLocationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-Sent Events hub for live booking location tracking.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveTrackingService {

    private static final long NO_TIMEOUT = 0L;

    /** Active streams keyed by the unguessable ticket. */
    private final Map<String, SseEmitter> emittersByTicket = new ConcurrentHashMap<>();

    /** Maps booking ID to the active ticket, so we can route location updates. */
    private final Map<Long, String> ticketByBookingId = new ConcurrentHashMap<>();

    /** Maps ticket back to booking ID for cleanup. */
    private final Map<String, Long> bookingIdByTicket = new ConcurrentHashMap<>();

    /**
     * Registers a live stream for a specific booking and returns its ticket.
     */
    public String createStream(Long bookingId) {
        // If an old stream exists for this booking, clean it up
        if (ticketByBookingId.containsKey(bookingId)) {
            remove(ticketByBookingId.get(bookingId));
        }

        String ticket = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(NO_TIMEOUT);
        
        emitter.onCompletion(() -> remove(ticket));
        emitter.onTimeout(() -> remove(ticket));
        emitter.onError(e -> remove(ticket));
        
        emittersByTicket.put(ticket, emitter);
        ticketByBookingId.put(bookingId, ticket);
        bookingIdByTicket.put(ticket, bookingId);
        
        return ticket;
    }

    /** Returns the emitter for a ticket, or null if the stream expired. */
    public SseEmitter getEmitter(String ticket) {
        return emittersByTicket.get(ticket);
    }

    /**
     * Pushes a new location to the active stream for a booking.
     */
    public void pushLocation(Long bookingId, Double lat, Double lon) {
        String ticket = ticketByBookingId.get(bookingId);
        if (ticket == null) {
            // Customer is not currently watching this booking
            return;
        }

        SseEmitter emitter = emittersByTicket.get(ticket);
        if (emitter == null) {
            return;
        }

        try {
            LiveTrackingLocationDto dto = LiveTrackingLocationDto.builder()
                    .latitude(lat)
                    .longitude(lon)
                    .timestamp(LocalDateTime.now())
                    .build();
            emitter.send(SseEmitter.event().name("location-update").data(dto));
        } catch (IOException e) {
            log.warn("Live tracking stream {} dropped: {}", ticket, e.toString());
            remove(ticket);
        }
    }

    /** Keeps connections alive. */
    @Scheduled(fixedRateString = "${fixmate.live-tracking.heartbeat-ms:25000}")
    public void heartbeat() {
        emittersByTicket.forEach((ticket, emitter) -> {
            try {
                emitter.send(SseEmitter.event().comment("keep-alive"));
            } catch (IOException e) {
                remove(ticket);
            }
        });
    }

    private void remove(String ticket) {
        if (ticket != null) {
            emittersByTicket.remove(ticket);
            Long bookingId = bookingIdByTicket.remove(ticket);
            if (bookingId != null) {
                ticketByBookingId.remove(bookingId);
            }
        }
    }
}

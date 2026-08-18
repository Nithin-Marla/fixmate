package com.fixmate.service;

import com.fixmate.event.PartnerStatusChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-Sent Events hub for the customer's nearby-partner results.
 *
 * <p>When a customer searches, the frontend first calls
 * POST /api/v1/search/nearby/stream (authenticated) to register a stream and
 * receive an unguessable ticket, then opens an EventSource to
 * GET /api/v1/search/nearby/stream/{ticket}. The ticket is the bearer
 * credential because the EventSource API cannot send Authorization headers.
 *
 * <p>Whenever a service partner changes their online/available status or live
 * location, a {@link PartnerStatusChangedEvent} triggers a recompute of every
 * active stream's search, and the fresh partner list (names, distances, rates,
 * status — all from the database) is pushed to the customer as SSE events.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveNearbyService {

    private static final long NO_TIMEOUT = 0L;

    private final SearchService searchService;

    /** Active customer streams keyed by the unguessable ticket. */
    private final Map<String, SseEmitter> emittersByTicket = new ConcurrentHashMap<>();

    /** Search parameters per ticket so events recompute the right results. */
    private final Map<String, SearchParams> paramsByTicket = new ConcurrentHashMap<>();

    private record SearchParams(Long categoryId, Double latitude, Double longitude, Double radiusKm) {}

    /**
     * Registers a live stream for the given search context and returns its
     * ticket. The stream stays open indefinitely until the client disconnects.
     */
    public String createStream(Long categoryId, Double latitude, Double longitude, Double radiusKm) {
        String ticket = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(NO_TIMEOUT);
        emitter.onCompletion(() -> remove(ticket));
        emitter.onTimeout(() -> remove(ticket));
        emitter.onError(e -> remove(ticket));
        emittersByTicket.put(ticket, emitter);
        paramsByTicket.put(ticket, new SearchParams(categoryId, latitude, longitude, radiusKm));
        return ticket;
    }

    /** Returns the emitter for a ticket, or null if the stream expired. */
    public SseEmitter getEmitter(String ticket) {
        return emittersByTicket.get(ticket);
    }

    /** Sends the current results to a freshly connected stream. */
    public void sendInitialSnapshot(String ticket) {
        pushSnapshot(ticket);
    }

    /**
     * A partner changed status or moved — refresh every active stream. Runs
     * synchronously on the partner's request thread: the fan-out is a handful
     * of streams × one indexed query, which is negligible next to the partner's
     * own save. (@Async on @EventListener turned out unreliable here; a
     * production build could scope this to streams whose category matches the
     * changed partner's skills.)
     */
    @EventListener
    public void onPartnerChanged(PartnerStatusChangedEvent event) {
        if (emittersByTicket.isEmpty()) {
            return;
        }
        log.info("Partner {} changed state — refreshing {} live stream(s)", event.getPartnerUserId(), emittersByTicket.size());
        // Recompute all streams: each one re-runs the same query the customer's
        // original search used, filtered by its own category/location/radius.
        emittersByTicket.keySet().forEach(this::pushSnapshot);
    }

    /** Keeps connections alive and defeats idle timeouts in proxies. */
    @Scheduled(fixedRateString = "${fixmate.live-nearby.heartbeat-ms:25000}")
    public void heartbeat() {
        emittersByTicket.forEach((ticket, emitter) -> {
            try {
                emitter.send(SseEmitter.event().comment("keep-alive"));
            } catch (IOException e) {
                remove(ticket);
            }
        });
    }

    private void pushSnapshot(String ticket) {
        SseEmitter emitter = emittersByTicket.get(ticket);
        SearchParams params = paramsByTicket.get(ticket);
        if (emitter == null || params == null) {
            return;
        }
        try {
            SearchService.NearbySearchResult result = searchService.findNearbyPartners(
                    params.categoryId(), params.latitude(), params.longitude(), params.radiusKm());
            emitter.send(SseEmitter.event().name("partners").data(result.partners()));
        } catch (IOException | RuntimeException e) {
            // Client gone or search failed — drop the stream and let the
            // customer re-search if they still want results.
            log.warn("Live stream {} dropped: {}", ticket, e.toString());
            remove(ticket);
        }
    }

    private void remove(String ticket) {
        emittersByTicket.remove(ticket);
        paramsByTicket.remove(ticket);
    }
}

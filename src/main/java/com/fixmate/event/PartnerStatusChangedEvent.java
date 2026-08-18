package com.fixmate.event;

import lombok.Getter;

/**
 * Published whenever a service partner's live state changes — online/available
 * status or current location. Live nearby streams listen for this and push a
 * refreshed partner list to every subscribed customer, so customers see
 * partners go ONLINE/OFFLINE or move without re-searching.
 */
@Getter
public class PartnerStatusChangedEvent {

    private final Long partnerUserId;

    public PartnerStatusChangedEvent(Long partnerUserId) {
        this.partnerUserId = partnerUserId;
    }
}

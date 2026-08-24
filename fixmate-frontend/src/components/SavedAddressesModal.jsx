import React, { useState } from 'react';
import { MapPin, Trash2, CheckCircle2, Navigation } from 'lucide-react';
import { fetchWithAuth } from '../api';

export default function SavedAddressesModal({ 
  addresses, 
  selectedAddressId, 
  onSelect, 
  onClose, 
  onAddNew, 
  onAddressDeleted,
  onAddressUpdated
}) {
  const [loadingId, setLoadingId] = useState(null);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    
    setLoadingId(id);
    try {
      const { data } = await fetchWithAuth(`/addresses/${id}`, { method: 'DELETE' });
      if (data.success) {
        onAddressDeleted(id);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete address');
    } finally {
      setLoadingId(null);
    }
  };

  const handleSetDefault = async (addr, e) => {
    e.stopPropagation();
    setLoadingId(addr.id);
    try {
      const payload = { ...addr, isDefault: true };
      const { data } = await fetchWithAuth(`/addresses/${addr.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (data.success) {
        onAddressUpdated(data.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to set default address');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 1050 }}>
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-100 relative z-10">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            Saved Addresses
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3 bg-base-200/50">
          {addresses.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <MapPin size={48} className="mx-auto mb-3 opacity-20" />
              <p>You haven't saved any addresses yet.</p>
            </div>
          ) : (
            addresses.map(addr => {
              const isSelected = String(selectedAddressId) === String(addr.id);
              return (
                <div 
                  key={addr.id} 
                  className={`border rounded-xl p-4 cursor-pointer transition-all bg-base-100 ${
                    isSelected ? 'border-primary ring-1 ring-primary/20 shadow-sm' : 'border-base-200 hover:border-primary/40 shadow-sm'
                  }`}
                  onClick={() => {
                    onSelect(String(addr.id));
                    onClose();
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary' : 'border-base-300'}`}>
                        {isSelected && <div className="w-3 h-3 rounded-full bg-primary" />}
                      </div>
                      <span className="font-bold text-sm text-base-content">
                        {addr.buildingName ? `${addr.buildingName}, ` : ''}{addr.street}
                      </span>
                    </div>
                    {addr.isDefault && (
                      <span className="badge badge-accent badge-sm text-[10px] uppercase font-bold py-2 ml-2">Default</span>
                    )}
                  </div>
                  
                  <p className="text-xs text-base-content/70 ml-8 mb-4 leading-relaxed">
                    {addr.city}, {addr.state} - {addr.zipCode}
                  </p>
                  
                  <div className="flex gap-2 ml-8">
                    {!addr.isDefault && (
                      <button 
                        className="btn btn-xs btn-outline hover:btn-primary"
                        onClick={(e) => handleSetDefault(addr, e)}
                        disabled={loadingId === addr.id}
                      >
                        {loadingId === addr.id ? 'Setting...' : 'Set as Default'}
                      </button>
                    )}
                    <button 
                      className="btn btn-xs btn-outline border-danger/30 text-danger hover:bg-danger hover:text-white hover:border-danger"
                      onClick={(e) => handleDelete(addr.id, e)}
                      disabled={loadingId === addr.id}
                    >
                      <Trash2 size={12} className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-200 bg-base-100 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            className="btn btn-primary btn-block"
            onClick={() => {
              onClose();
              onAddNew();
            }}
          >
            <Navigation size={16} /> Add New Address
          </button>
        </div>
        
      </div>
    </div>
  );
}

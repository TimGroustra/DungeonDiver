"use client";

import React from "react";
import { Labyrinth } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface InventoryProps {
  labyrinth: Labyrinth;
  onUseItem: (itemId: string) => void;
  isGameOver: boolean;
  showRPS: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ labyrinth, onUseItem, isGameOver, showRPS }) => {
  const inventoryItems = labyrinth.getInventoryItems();
  const equippedWeapon = labyrinth.getEquippedWeapon();
  const equippedShield = labyrinth.getEquippedShield();
  const equippedAmulet = labyrinth.getEquippedAmulet();
  const equippedCompass = labyrinth.getEquippedCompass();

  const handleUseItemClick = (itemId: string) => {
    if (isGameOver || showRPS) {
      toast.info("Cannot use items right now.");
      return;
    }
    onUseItem(itemId);
  };

  return (
    <div className="mt-4 w-full" style={{ maxWidth: `200px` }}> {/* Constrain width to match map's default size */}
      <h3 className="text-xl font-bold text-lime-300 dark:text-lime-600 mb-2 text-center lg:text-left">Inventory:</h3>
      {inventoryItems.length === 0 ? (
        <p className="text-gray-300 dark:text-gray-700 text-sm italic">Your inventory is empty.</p>
      ) : (
        <ScrollArea className="h-[200px] w-full pr-3">
          <ul className="space-y-2 text-xs text-gray-300 dark:text-gray-700">
            {inventoryItems.map(({ item, quantity }) => {
              let equippedStatus = "";
              let isEquipped = false;

              if (item.type === 'weapon' && equippedWeapon?.id === item.id) {
                equippedStatus = "(Equipped Weapon)";
                isEquipped = true;
              } else if (item.type === 'shield' && equippedShield?.id === item.id) {
                equippedStatus = "(Equipped Shield)";
                isEquipped = true;
              } else if (item.type === 'accessory') {
                if (item.id === "scholar-amulet-f0" && equippedAmulet?.id === item.id) {
                  equippedStatus = "(Equipped Amulet)";
                  isEquipped = true;
                } else if (item.id === "true-compass-f2" && equippedCompass?.id === item.id) {
                  equippedStatus = "(Equipped Compass)";
                  isEquipped = true;
                }
              }

              const isConsumableWithUses = item.type === 'consumable' && item.stackable;
              const canUse = !isGameOver && !showRPS && (isConsumableWithUses ? quantity > 0 : true);
              const buttonText = isConsumableWithUses ? 'Use' : (isEquipped ? 'Unequip' : 'Equip');

              return (
                <li key={item.id} className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      <span className="font-medium text-white dark:text-gray-950">{item.name}</span>
                      {isConsumableWithUses && <span className="ml-1 text-gray-400 dark:text-gray-600">(x{quantity})</span>}
                      {equippedStatus && <span className="ml-2 text-green-400 dark:text-green-600 text-xs">{equippedStatus}</span>}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                  {(item.type === 'consumable' || item.type === 'weapon' || item.type === 'shield' || item.type === 'accessory') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white dark:bg-gray-300 dark:hover:bg-gray-400 dark:text-gray-900"
                      onClick={() => handleUseItemClick(item.id)}
                      disabled={!canUse}
                    >
                      {buttonText}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
};

export default Inventory;
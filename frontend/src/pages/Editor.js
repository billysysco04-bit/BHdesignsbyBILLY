import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { 
  ChefHat, ArrowLeft, Plus, Trash2, Wand2, Download, Save, 
  Type, Palette, Layout as LayoutIcon, Image as ImageIcon, 
  Sparkles, Check, Upload, Square, Frame, X, Layers,
  ChevronLeft, ChevronRight, Copy, FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { ScrollArea } from '../components/ui/scroll-area';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============= CONSTANTS =============
const FONTS = [
  { name: 'Playfair Display', style: 'serif' },
  { name: 'DM Sans', style: 'sans-serif' },
  { name: 'Merriweather', style: 'serif' },
  { name: 'Inter', style: 'sans-serif' },
  { name: 'Lora', style: 'serif' },
  { name: 'Roboto', style: 'sans-serif' },
  { name: 'Montserrat', style: 'sans-serif' },
  { name: 'Crimson Text', style: 'serif' },
  { name: 'Georgia', style: 'serif' },
  { name: 'Times New Roman', style: 'serif' }
];

const PRESET_BACKGROUNDS = [
  { id: 'none', name: 'None', url: '', thumbnail: null },
  { id: 'elegant', name: 'Elegant Texture', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=150&q=60' },
  { id: 'wood', name: 'Wood Grain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=150&q=60' },
  { id: 'marble', name: 'Marble', url: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=150&q=60' },
  { id: 'linen', name: 'Linen', url: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=150&q=60' },
  { id: 'dark', name: 'Dark Slate', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=150&q=60' },
];

const COLOR_PRESETS = {
  title: ['#1a1a1a', '#2d3748', '#744210', '#22543d', '#1a365d', '#553c9a', '#97266d', '#c53030'],
  price: ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#d62828', '#2a9d8f', '#e76f51', '#264653'],
  background: ['#ffffff', '#f8f5f0', '#faf3e0', '#e8e8e8', '#1a1a1a', '#2d3748', '#f0e6d3', '#e6f0e8']
};

const BORDER_STYLES = [
  { id: 'none', name: 'None', style: 'none', preview: null },
  { id: 'solid', name: 'Solid', style: 'solid', preview: '━━━━' },
  { id: 'dashed', name: 'Dashed', style: 'dashed', preview: '┄┄┄┄' },
  { id: 'dotted', name: 'Dotted', style: 'dotted', preview: '····' },
  { id: 'double', name: 'Double', style: 'double', preview: '═══' },
];

const DECORATIVE_BORDERS = [
  { id: 'none', name: 'None', corners: null, sides: null },
  { id: 'elegant', name: 'Elegant', corners: '❧', sides: '─' },
  { id: 'ornate', name: 'Ornate', corners: '✦', sides: '═' },
  { id: 'classic', name: 'Classic', corners: '◆', sides: '─' },
  { id: 'floral', name: 'Floral', corners: '❀', sides: '·' },
  { id: 'art-deco', name: 'Art Deco', corners: '◇', sides: '═' },
  { id: 'vintage', name: 'Vintage', corners: '✿', sides: '─' },
];

// Layout options
const LAYOUTS = [
  { id: 'single-column', name: 'Single Column', icon: '▌', columns: 1 },
  { id: 'two-column', name: 'Two Columns', icon: '▌▐', columns: 2 },
  { id: 'three-column', name: 'Three Columns', icon: '▌▐▐', columns: 3 },
  { id: 'grid', name: 'Grid (2x2)', icon: '▚', columns: 2, grid: true },
  { id: 'centered', name: 'Centered', icon: '◯', columns: 1, centered: true },
  { id: 'asymmetric', name: 'Asymmetric', icon: '▌ ▐', columns: 2, asymmetric: true },
];

// Page size presets
const PAGE_SIZES = [
  { id: 'letter', name: 'Letter', width: 816, height: 1056, label: '8.5" x 11"' },
  { id: 'legal', name: 'Legal', width: 816, height: 1344, label: '8.5" x 14"' },
  { id: 'tabloid', name: 'Tabloid', width: 1056, height: 1632, label: '11" x 17"' },
  { id: 'half-letter', name: 'Half Letter', width: 528, height: 816, label: '5.5" x 8.5"' },
  { id: 'digital', name: 'Digital', width: 1080, height: 1920, label: '1080 x 1920' },
  { id: 'custom', name: 'Custom', width: 800, height: 1100, label: 'Custom' },
];

const DEFAULT_PAGE_DESIGN = {
  title: 'Menu',
  subtitle: 'A curated selection',
  titleFont: 'Playfair Display',
  titleSize: 52,
  titleColor: '#1a1a1a',
  titleAlign: 'center',
  subtitleFont: 'DM Sans',
  subtitleSize: 18,
  subtitleColor: '#666666',
  itemFont: 'DM Sans',
  itemNameSize: 20,
  itemNameColor: '#1a1a1a',
  descriptionSize: 14,
  descriptionColor: '#666666',
  priceFont: 'Playfair Display',
  priceSize: 20,
  priceColor: '#e07a5f',
  categoryFont: 'Playfair Display',
  categorySize: 28,
  categoryColor: '#1a1a1a',
  categoryUppercase: true,
  backgroundColor: '#ffffff',
  backgroundImage: '',
  backgroundImageType: 'none',
  backgroundOpacity: 100,
  // Layout & Page Size
  layout: 'single-column',
  pageSizeId: 'letter',
  pageWidth: 816,
  pageHeight: 1056,
  padding: 50,
  itemSpacing: 24,
  categorySpacing: 40,
  // Borders
  menuBorderStyle: 'none',
  menuBorderWidth: 2,
  menuBorderColor: '#1a1a1a',
  decorativeBorder: 'none',
  decorativeBorderColor: '#1a1a1a',
  showTitleBorder: true,
  titleBorderStyle: 'solid',
  titleBorderColor: '#1a1a1a',
  showCategoryBorder: true,
  categoryBorderStyle: 'solid',
  categoryBorderColor: '#cccccc',
  showWarning: true,
  warningPosition: 'bottom'
};

// ============= HELPER COMPONENTS =============

// Professional print-ready menu layout component
// STRICT LAYOUT RULES:
// 1. Items flow left→right, then top→bottom (reading order)
// 2. Two-column: Top-left → Top-right → Next row left → Next row right
// 3. Items never split across pages
// 4. Clean pagination with no overflow/clipping

const MenuItemsLayout = ({ groupedItems, design, layoutConfig }) => {
  const categories = Object.entries(groupedItems);
  const columns = layoutConfig?.columns || 1;
  const isCentered = layoutConfig?.centered || design.layout === 'centered';
  
  // Flatten all items with their category headers for row-based rendering
  const allElements = [];
  categories.forEach(([category, items]) => {
    // Add category header as an element
    allElements.push({ type: 'category', category, key: `cat-${category}` });
    // Add each item
    items.forEach((item) => {
      allElements.push({ type: 'item', item, category, key: item.id });
    });
  });
  
  // For single column or centered - use simple linear layout
  if (columns === 1 || isCentered) {
    return (
      <div style={{ maxWidth: isCentered ? '600px' : '100%', margin: isCentered ? '0 auto' : '0' }}>
        {categories.map(([category, items]) => (
          <CategoryBlock 
            key={category} 
            category={category} 
            items={items} 
            design={design} 
            isCentered={isCentered}
          />
        ))}
      </div>
    );
  }
  
  // For multi-column layouts - ROW-BASED rendering (left→right, top→bottom)
  // Group items into rows of N columns
  const rows = [];
  let currentCategory = null;
  let itemBuffer = [];
  
  // Process items by category, creating rows that flow left-to-right
  categories.forEach(([category, items]) => {
    // Flush any remaining items from previous category
    if (itemBuffer.length > 0) {
      // Pad the last row if needed
      while (itemBuffer.length < columns) {
        itemBuffer.push(null);
      }
      rows.push({ type: 'items', items: [...itemBuffer], category: currentCategory });
      itemBuffer = [];
    }
    
    // Add category header row (spans all columns)
    rows.push({ type: 'category', category, key: `cat-${category}` });
    currentCategory = category;
    
    // Add items in rows of N columns (left→right flow)
    items.forEach((item) => {
      itemBuffer.push(item);
      if (itemBuffer.length === columns) {
        rows.push({ type: 'items', items: [...itemBuffer], category });
        itemBuffer = [];
      }
    });
  });
  
  // Flush remaining items
  if (itemBuffer.length > 0) {
    while (itemBuffer.length < columns) {
      itemBuffer.push(null);
    }
    rows.push({ type: 'items', items: [...itemBuffer], category: currentCategory });
  }
  
  const compact = columns >= 3;
  const columnGap = columns >= 3 ? '24px' : '32px';
  
  return (
    <div style={{ width: '100%' }}>
      {rows.map((row, rowIdx) => {
        if (row.type === 'category') {
          // Category header spans full width
          return (
            <div 
              key={row.key} 
              style={{
                marginTop: rowIdx > 0 ? `${design.categorySpacing}px` : '0',
                marginBottom: `${Math.max(12, design.itemSpacing - 8)}px`,
                borderBottom: design.showCategoryBorder ? `1px ${design.categoryBorderStyle} ${design.categoryBorderColor}` : 'none',
                paddingBottom: design.showCategoryBorder ? '12px' : '0',
                breakInside: 'avoid',
                pageBreakInside: 'avoid'
              }}
            >
              <h2 style={{
                fontFamily: design.categoryFont,
                fontSize: compact ? `${Math.max(16, design.categorySize - 6)}px` : `${design.categorySize}px`,
                color: design.categoryColor,
                fontWeight: '700',
                textTransform: design.categoryUppercase ? 'uppercase' : 'none',
                letterSpacing: design.categoryUppercase ? '2px' : 'normal',
                margin: 0,
                lineHeight: 1.2
              }}>
                {row.category}
              </h2>
            </div>
          );
        }
        
        // Item row - CSS Grid for perfect alignment
        return (
          <div 
            key={`row-${rowIdx}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: columnGap,
              marginBottom: `${design.itemSpacing}px`,
              breakInside: 'avoid',
              pageBreakInside: 'avoid'
            }}
          >
            {row.items.map((item, colIdx) => (
              <div 
                key={item?.id || `empty-${rowIdx}-${colIdx}`}
                style={{
                  paddingLeft: colIdx > 0 ? '16px' : '0',
                  borderLeft: colIdx > 0 ? '1px solid #e5e5e5' : 'none',
                  minHeight: item ? 'auto' : '0'
                }}
              >
                {item && (
                  <MenuItemBlock 
                    item={item} 
                    design={design} 
                    isLast={false}
                    isCentered={false}
                    compact={compact}
                    showDotLeader={false}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// Category block component with header and items (for single-column only)
const CategoryBlock = ({ category, items, design, isCentered = false, compact = false }) => (
  <div style={{ 
    marginBottom: `${design.categorySpacing}px`,
    breakInside: 'avoid',
    pageBreakInside: 'avoid'
  }}>
    {/* Category Header */}
    <div style={{
      textAlign: isCentered ? 'center' : 'left',
      marginBottom: `${Math.max(12, design.itemSpacing - 8)}px`,
      borderBottom: design.showCategoryBorder ? `1px ${design.categoryBorderStyle} ${design.categoryBorderColor}` : 'none',
      paddingBottom: design.showCategoryBorder ? '12px' : '0'
    }}>
      <h2 style={{
        fontFamily: design.categoryFont,
        fontSize: compact ? `${Math.max(16, design.categorySize - 6)}px` : `${design.categorySize}px`,
        color: design.categoryColor,
        fontWeight: '700',
        textTransform: design.categoryUppercase ? 'uppercase' : 'none',
        letterSpacing: design.categoryUppercase ? '2px' : 'normal',
        margin: 0,
        lineHeight: 1.2
      }}>
        {category}
      </h2>
    </div>
    
    {/* Menu Items */}
    {items.map((item, itemIdx) => (
      <MenuItemBlock 
        key={item.id} 
        item={item} 
        design={design} 
        isLast={itemIdx === items.length - 1}
        isCentered={isCentered}
        compact={compact}
        showDotLeader={!isCentered && design.layout === 'single-column'}
      />
    ))}
  </div>
);

// Individual menu item component
const MenuItemBlock = ({ item, design, isLast, isCentered = false, compact = false, showDotLeader = false }) => (
  <div style={{ 
    marginBottom: isLast ? '0' : `${design.itemSpacing}px`,
    breakInside: 'avoid',
    pageBreakInside: 'avoid'
  }}>
    {/* Item Name and Price Row */}
    <div style={{
      display: 'flex',
      justifyContent: isCentered ? 'center' : 'space-between',
      alignItems: 'baseline',
      gap: '12px',
      flexDirection: isCentered ? 'column' : 'row',
      textAlign: isCentered ? 'center' : 'left'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'baseline', 
        gap: '8px',
        flex: isCentered ? 'none' : 1,
        minWidth: 0
      }}>
        <h3 style={{ 
          fontFamily: design.itemFont, 
          fontSize: compact ? `${Math.max(14, design.itemNameSize - 4)}px` : `${design.itemNameSize}px`, 
          color: design.itemNameColor, 
          fontWeight: '600',
          margin: 0,
          lineHeight: '1.4'
        }}>
          {item.name}
        </h3>
        {/* Dot leader line - for single column only */}
        {showDotLeader && (
          <span style={{
            flex: 1,
            borderBottom: '1px dotted #bbb',
            marginBottom: '5px',
            minWidth: '24px'
          }} />
        )}
      </div>
      <span style={{ 
        fontFamily: design.priceFont, 
        fontSize: compact ? `${Math.max(14, design.priceSize - 4)}px` : `${design.priceSize}px`, 
        color: design.priceColor, 
        fontWeight: '700',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}>
        ${item.price}
      </span>
    </div>
    
    {/* Description */}
    {item.description && (
      <p style={{ 
        fontFamily: design.itemFont, 
        fontSize: compact ? `${Math.max(11, design.descriptionSize - 2)}px` : `${design.descriptionSize}px`, 
        color: design.descriptionColor, 
        lineHeight: '1.5',
        margin: '6px 0 0 0',
        fontStyle: 'italic',
        textAlign: isCentered ? 'center' : 'left',
        maxWidth: isCentered ? '400px' : '100%',
        marginLeft: isCentered ? 'auto' : '0',
        marginRight: isCentered ? 'auto' : '0'
      }}>
        {item.description}
      </p>
    )}
  </div>
);

const ColorPickerWithPresets = ({ label, value, onChange, presets }) => (
  <div className="space-y-2">
    <Label className="text-neutral-300 text-xs font-medium">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg cursor-pointer border-2 border-neutral-600 bg-transparent"
      />
      <div className="flex-1 grid grid-cols-8 gap-1">
        {presets.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`w-6 h-6 rounded-md transition-all hover:scale-110 relative ${
              value === color ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-neutral-800' : 'hover:ring-1 hover:ring-neutral-500'
            }`}
            style={{ backgroundColor: color }}
          >
            {value === color && <Check className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs bg-neutral-700 border-neutral-600 text-white font-mono" placeholder="#000000" />
  </div>
);

const FontSelector = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <Label className="text-neutral-300 text-xs font-medium">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white h-10">
        <SelectValue><span style={{ fontFamily: value }}>{value}</span></SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-neutral-800 border-neutral-700 max-h-64 z-50">
        {FONTS.map((font) => (
          <SelectItem key={font.name} value={font.name} className="text-white hover:bg-neutral-700 cursor-pointer">
            <span style={{ fontFamily: font.name }}>{font.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const SizeSlider = ({ label, value, onChange, min, max, unit = 'px' }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-neutral-300 text-xs font-medium">{label}</Label>
      <span className="text-emerald-400 text-xs font-mono bg-neutral-700 px-2 py-0.5 rounded">{value}{unit}</span>
    </div>
    <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={1} />
  </div>
);

// ============= MAIN EDITOR COMPONENT =============
export default function Editor() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [customBackgroundPreview, setCustomBackgroundPreview] = useState(null);
  
  // Multi-page state
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [design, setDesign] = useState({ ...DEFAULT_PAGE_DESIGN });

  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', category: 'Appetizers', image_url: '', ingredients: ''
  });

  // Get current page
  const currentPage = pages[currentPageIndex] || null;

  // ============= DATA LOADING =============
  useEffect(() => {
    if (menuId) {
      loadMenu();
    } else {
      createNewMenu();
    }
  }, [menuId]);

  // Sync design with current page
  useEffect(() => {
    if (currentPage) {
      const pageDesign = currentPage.design || {};
      setDesign({
        ...DEFAULT_PAGE_DESIGN,
        title: currentPage.title || 'Menu',
        subtitle: currentPage.subtitle || '',
        // Ensure all saved design properties override defaults
        ...pageDesign
      });
      // Update custom background preview if there's a custom image
      if (pageDesign.backgroundImageType === 'custom' && pageDesign.backgroundImage) {
        setCustomBackgroundPreview(pageDesign.backgroundImage);
      } else {
        setCustomBackgroundPreview(null);
      }
    }
  }, [currentPageIndex, pages]);

  const loadMenu = async () => {
    try {
      const data = await api.getMenu(menuId);
      setMenu(data);
      
      // Load pages or create default page from items
      if (data.pages && data.pages.length > 0) {
        setPages(data.pages);
      } else {
        // Backward compatibility: create single page from flat items
        const defaultPage = {
          id: `page-${Date.now()}`,
          page_number: 1,
          title: data.title || 'Menu',
          subtitle: '',
          items: data.items || [],
          design: { ...DEFAULT_PAGE_DESIGN, title: data.title || 'Menu' }
        };
        setPages([defaultPage]);
      }
      setCurrentPageIndex(0);
    } catch (error) {
      toast.error('Failed to load menu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createNewMenu = async () => {
    try {
      const newMenu = await api.createMenu('Restaurant Menu');
      setMenu(newMenu);
      const defaultPage = {
        id: `page-${Date.now()}`,
        page_number: 1,
        title: 'Restaurant Menu',
        subtitle: 'A curated selection',
        items: [],
        design: { ...DEFAULT_PAGE_DESIGN }
      };
      setPages([defaultPage]);
      navigate(`/editor/${newMenu.id}`, { replace: true });
    } catch (error) {
      toast.error('Failed to create menu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ============= PAGE MANAGEMENT =============
  const addNewPage = () => {
    const newPage = {
      id: `page-${Date.now()}`,
      page_number: pages.length + 1,
      title: `Page ${pages.length + 1}`,
      subtitle: '',
      items: [],
      design: { ...DEFAULT_PAGE_DESIGN, title: `Page ${pages.length + 1}` }
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
    toast.success('New page added');
  };

  const duplicatePage = () => {
    if (!currentPage) return;
    const duplicatedPage = {
      ...JSON.parse(JSON.stringify(currentPage)),
      id: `page-${Date.now()}`,
      page_number: pages.length + 1,
      title: `${currentPage.title} (Copy)`
    };
    setPages([...pages, duplicatedPage]);
    setCurrentPageIndex(pages.length);
    toast.success('Page duplicated');
  };

  const deletePage = () => {
    if (pages.length <= 1) {
      toast.error('Cannot delete the only page');
      return;
    }
    if (window.confirm('Delete this page?')) {
      const newPages = pages.filter((_, idx) => idx !== currentPageIndex);
      // Re-number pages
      newPages.forEach((p, idx) => { p.page_number = idx + 1; });
      setPages(newPages);
      setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
      toast.success('Page deleted');
    }
  };

  const updateCurrentPageDesign = (updates) => {
    const newDesign = { ...design, ...updates };
    setDesign(newDesign);
    
    // Update page in pages array
    const updatedPages = [...pages];
    if (updatedPages[currentPageIndex]) {
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        title: newDesign.title,
        subtitle: newDesign.subtitle,
        design: newDesign
      };
      setPages(updatedPages);
    }
  };

  // Apply layout to ALL pages (for consistent multi-page menus)
  const applyLayoutToAllPages = (layoutId) => {
    const layoutConfig = LAYOUTS.find(l => l.id === layoutId) || LAYOUTS[0];
    const newDesign = { ...design, layout: layoutId };
    setDesign(newDesign);
    
    const updatedPages = pages.map((page, idx) => ({
      ...page,
      design: {
        ...page.design,
        layout: layoutId
      }
    }));
    setPages(updatedPages);
    toast.success(`Layout applied to all ${updatedPages.length} pages`);
  };

  // Apply page size to ALL pages
  const applyPageSizeToAllPages = (sizeId) => {
    const pageSize = PAGE_SIZES.find(p => p.id === sizeId);
    if (!pageSize) return;
    
    const newDesign = { 
      ...design, 
      pageSizeId: sizeId, 
      pageWidth: pageSize.width, 
      pageHeight: pageSize.height 
    };
    setDesign(newDesign);
    
    const updatedPages = pages.map((page) => ({
      ...page,
      design: {
        ...page.design,
        pageSizeId: sizeId,
        pageWidth: pageSize.width,
        pageHeight: pageSize.height
      }
    }));
    setPages(updatedPages);
    toast.success(`Page size applied to all ${updatedPages.length} pages`);
  };

  // ============= HANDLERS =============
  const handleSave = async () => {
    setSaving(true);
    try {
      // Flatten items from all pages for backward compatibility
      const allItems = pages.flatMap(p => p.items || []);
      
      await api.updateMenu(menu.id, {
        title: pages[0]?.title || 'Menu',
        items: allItems,
        pages: pages,
        include_warning: design.showWarning
      });
      toast.success('Menu saved!');
    } catch (error) {
      toast.error('Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', description: '', price: '', category: 'Appetizers', image_url: '', ingredients: '' });
    setShowItemDialog(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm(item);
    setShowItemDialog(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.price) {
      toast.error('Name and price are required');
      return;
    }
    const newItem = { ...itemForm, id: editingItem?.id || `item-${Date.now()}` };
    
    const updatedPages = [...pages];
    if (updatedPages[currentPageIndex]) {
      const pageItems = updatedPages[currentPageIndex].items || [];
      if (editingItem) {
        updatedPages[currentPageIndex].items = pageItems.map(item => item.id === editingItem.id ? newItem : item);
        toast.success('Item updated');
      } else {
        updatedPages[currentPageIndex].items = [...pageItems, newItem];
        toast.success('Item added to page');
      }
      setPages(updatedPages);
    }
    setShowItemDialog(false);
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Delete this item?')) {
      const updatedPages = [...pages];
      if (updatedPages[currentPageIndex]) {
        updatedPages[currentPageIndex].items = (updatedPages[currentPageIndex].items || []).filter(item => item.id !== itemId);
        setPages(updatedPages);
        toast.success('Item removed');
      }
    }
  };

  const handleGenerateDescription = async () => {
    if (!itemForm.name) {
      toast.error('Please enter a dish name first');
      return;
    }
    setGeneratingAI(true);
    try {
      const response = await api.generateDescription(itemForm.name, itemForm.ingredients || '', 'chef');
      setItemForm({ ...itemForm, description: response.description });
      toast.success('Chef-inspired description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleExportPDF = async () => {
    toast.info('Generating PDF with all pages...');
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [design.pageWidth, 1100] });
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        
        // Temporarily switch to this page for rendering
        setCurrentPageIndex(i);
        await new Promise(r => setTimeout(r, 500)); // Allow render
        
        const element = document.getElementById('menu-preview');
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: design.backgroundColor, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, design.pageWidth, canvas.height);
      }
      
      pdf.save(`${menu?.title || 'Menu'}.pdf`);
      toast.success('PDF downloaded with all pages!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  // Background upload
  const onBackgroundDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      updateCurrentPageDesign({ backgroundImage: e.target.result, backgroundImageType: 'custom' });
      setCustomBackgroundPreview(e.target.result);
      toast.success('Background image uploaded!');
    };
    reader.readAsDataURL(file);
  }, [currentPageIndex]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onBackgroundDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    maxSize: 5242880
  });

  const handlePresetBackgroundSelect = (preset) => {
    updateCurrentPageDesign({ backgroundImage: preset.url, backgroundImageType: preset.id === 'none' ? 'none' : 'preset' });
  };

  const removeCustomBackground = () => {
    updateCurrentPageDesign({ backgroundImage: '', backgroundImageType: 'none' });
    setCustomBackgroundPreview(null);
  };

  // Get current page items grouped by category
  const currentPageItems = currentPage?.items || [];
  const groupedItems = currentPageItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const getDecorativeBorderStyle = () => {
    const border = DECORATIVE_BORDERS.find(b => b.id === design.decorativeBorder);
    if (!border || border.id === 'none') return null;
    return border;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading editor...</p>
        </div>
      </div>
    );
  }

  const decorativeBorderData = getDecorativeBorderStyle();

  return (
    <div className="h-screen flex flex-col bg-neutral-900">
      {/* TOP BAR */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" className="text-white hover:bg-neutral-700">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="h-6 w-px bg-neutral-600" />
          <ChefHat className="w-5 h-5 text-emerald-500" />
          <span className="text-white font-semibold">MenuMaker Editor</span>
          
          {/* Page indicator */}
          {pages.length > 1 && (
            <div className="flex items-center gap-2 ml-4 bg-neutral-700 px-3 py-1.5 rounded-full">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-white text-sm font-medium">{pages.length} Pages</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleExportPDF} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR - ITEMS + PAGES */}
        <div className="w-72 bg-neutral-800 border-r border-neutral-700 flex flex-col shrink-0">
          {/* Page Navigation */}
          <div className="p-3 border-b border-neutral-700 bg-neutral-750">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />Pages
              </h3>
              <Button onClick={addNewPage} size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-neutral-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Page tabs */}
            <div className="flex gap-1 flex-wrap">
              {pages.map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    idx === currentPageIndex
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            {/* Page actions */}
            {pages.length > 0 && (
              <div className="flex gap-1 mt-2">
                <Button onClick={duplicatePage} size="sm" variant="ghost" className="h-7 text-xs text-neutral-400 hover:text-white">
                  <Copy className="w-3 h-3 mr-1" />Duplicate
                </Button>
                {pages.length > 1 && (
                  <Button onClick={deletePage} size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300">
                    <Trash2 className="w-3 h-3 mr-1" />Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Items for current page */}
          <div className="p-4 border-b border-neutral-700">
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
              Page {currentPageIndex + 1} Items
            </h3>
            <Button onClick={handleAddItem} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" />Add Menu Item
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3">
              {currentPageItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-neutral-500" />
                  </div>
                  <p className="text-neutral-400 text-sm">No items on this page</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentPageItems.map((item) => (
                    <div key={item.id} onClick={() => handleEditItem(item)} className="bg-neutral-700 hover:bg-neutral-650 p-3 rounded-lg cursor-pointer group transition-all border border-transparent hover:border-emerald-500/30">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{item.name}</p>
                          <p className="text-emerald-400 text-xs font-semibold mt-1">${item.price}</p>
                          <p className="text-neutral-400 text-xs mt-1 truncate">{item.category}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER - PREVIEW */}
        <div className="flex-1 overflow-auto bg-neutral-950 p-8">
          {/* Page navigation arrows */}
          {pages.length > 1 && (
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                variant="outline"
                size="sm"
                className="border-neutral-600 text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <div className="bg-neutral-800 px-4 py-2 rounded-lg">
                <span className="text-white font-medium">Page {currentPageIndex + 1} of {pages.length}</span>
              </div>
              <Button
                onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex >= pages.length - 1}
                variant="outline"
                size="sm"
                className="border-neutral-600 text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          <div className="flex justify-center">
            <div
              id="menu-preview"
              className="shadow-2xl relative"
              style={{
                width: `${design.pageWidth}px`,
                height: `${design.pageHeight}px`,
                maxHeight: `${design.pageHeight}px`,
                overflow: 'hidden',
                backgroundColor: design.backgroundColor,
                backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: design.menuBorderStyle !== 'none' ? `${design.menuBorderWidth}px ${design.menuBorderStyle} ${design.menuBorderColor}` : 'none',
              }}
            >
              {/* Background overlay */}
              {design.backgroundImage && design.backgroundOpacity < 100 && (
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: design.backgroundColor, opacity: (100 - design.backgroundOpacity) / 100 }} />
              )}

              {/* Decorative Border */}
              {decorativeBorderData && (
                <div className="absolute inset-4 pointer-events-none" style={{ color: design.decorativeBorderColor }}>
                  <span className="absolute top-0 left-0 text-2xl">{decorativeBorderData.corners}</span>
                  <span className="absolute top-0 right-0 text-2xl">{decorativeBorderData.corners}</span>
                  <span className="absolute bottom-0 left-0 text-2xl">{decorativeBorderData.corners}</span>
                  <span className="absolute bottom-0 right-0 text-2xl">{decorativeBorderData.corners}</span>
                  <div className="absolute top-0 left-8 right-8 text-center overflow-hidden whitespace-nowrap text-sm tracking-[0.5em]">
                    {decorativeBorderData.sides.repeat(50)}
                  </div>
                  <div className="absolute bottom-0 left-8 right-8 text-center overflow-hidden whitespace-nowrap text-sm tracking-[0.5em]">
                    {decorativeBorderData.sides.repeat(50)}
                  </div>
                </div>
              )}

              {/* Menu Content - Flex container for proper layout */}
              <div style={{ 
                position: 'relative', 
                zIndex: 1, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: `${design.padding}px`,
                boxSizing: 'border-box'
              }}>
                {/* Title */}
                <div style={{ 
                  textAlign: design.titleAlign, 
                  borderBottom: design.showTitleBorder ? `2px ${design.titleBorderStyle} ${design.titleBorderColor}` : 'none', 
                  paddingBottom: design.showTitleBorder ? '20px' : '0',
                  marginBottom: '24px',
                  flexShrink: 0
                }}>
                  <h1 style={{ fontFamily: design.titleFont, fontSize: `${design.titleSize}px`, color: design.titleColor, fontWeight: 'bold', lineHeight: 1.2, marginBottom: '8px' }}>
                    {design.title}
                  </h1>
                  <p style={{ fontFamily: design.subtitleFont, fontSize: `${design.subtitleSize}px`, color: design.subtitleColor, marginTop: '4px' }}>
                    {design.subtitle}
                  </p>
                </div>

                {/* Warning Top (if position is top) */}
                {design.showWarning && design.warningPosition === 'top' && (
                  <div style={{
                    marginBottom: '24px',
                    padding: '12px 16px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    flexShrink: 0
                  }}>
                    <p style={{ 
                      color: '#92400e', 
                      fontSize: '10px', 
                      lineHeight: '1.4',
                      margin: 0,
                      textAlign: 'center'
                    }}>
                      <strong>CONSUMER ADVISORY:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                    </p>
                  </div>
                )}

                {/* Items Container - Takes remaining space, clips overflow */}
                <div style={{ 
                  flex: 1,
                  overflow: 'hidden',
                  minHeight: 0
                }}>
                  {Object.keys(groupedItems).length === 0 ? (
                    <div className="text-center py-20" style={{ color: design.descriptionColor }}>
                      <p className="text-lg">Add menu items to see your design</p>
                    </div>
                  ) : (
                    <MenuItemsLayout 
                      groupedItems={groupedItems} 
                      design={design} 
                      layoutConfig={LAYOUTS.find(l => l.id === design.layout) || LAYOUTS[0]}
                    />
                  )}
                </div>

                {/* Warning Bottom - Always at page bottom */}
                {design.showWarning && design.warningPosition === 'bottom' && (
                  <div style={{ 
                    marginTop: 'auto',
                    paddingTop: '16px',
                    flexShrink: 0
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px'
                    }}>
                      <p style={{ 
                        color: '#92400e', 
                        fontSize: '10px', 
                        lineHeight: '1.4',
                        margin: 0,
                        textAlign: 'center'
                      }}>
                        <strong>CONSUMER ADVISORY:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - DESIGN CONTROLS */}
        <div className="w-[380px] bg-neutral-800 border-l border-neutral-700 flex flex-col shrink-0">
          <Tabs defaultValue="style" className="flex flex-col h-full">
            <TabsList className="grid grid-cols-4 bg-neutral-700 p-1 m-3 rounded-lg shrink-0">
              <TabsTrigger value="text" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <Type className="w-3.5 h-3.5 mr-1" />Text
              </TabsTrigger>
              <TabsTrigger value="style" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <Palette className="w-3.5 h-3.5 mr-1" />Style
              </TabsTrigger>
              <TabsTrigger value="background" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <ImageIcon className="w-3.5 h-3.5 mr-1" />BG
              </TabsTrigger>
              <TabsTrigger value="border" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <Frame className="w-3.5 h-3.5 mr-1" />Border
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* TEXT TAB */}
              <TabsContent value="text" className="p-4 space-y-4 mt-0">
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Type className="w-4 h-4 text-emerald-500" />Title & Subtitle
                  </h4>
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Page Title</Label>
                    <Input value={design.title} onChange={(e) => updateCurrentPageDesign({ title: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Subtitle</Label>
                    <Input value={design.subtitle} onChange={(e) => updateCurrentPageDesign({ subtitle: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white" />
                  </div>
                  <FontSelector label="Title Font" value={design.titleFont} onChange={(v) => updateCurrentPageDesign({ titleFont: v })} />
                  <SizeSlider label="Title Size" value={design.titleSize} onChange={(v) => updateCurrentPageDesign({ titleSize: v })} min={28} max={80} />
                  <FontSelector label="Subtitle Font" value={design.subtitleFont} onChange={(v) => updateCurrentPageDesign({ subtitleFont: v })} />
                  <SizeSlider label="Subtitle Size" value={design.subtitleSize} onChange={(v) => updateCurrentPageDesign({ subtitleSize: v })} min={12} max={32} />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Menu Items Typography</h4>
                  <FontSelector label="Item Font" value={design.itemFont} onChange={(v) => updateCurrentPageDesign({ itemFont: v })} />
                  <SizeSlider label="Item Name Size" value={design.itemNameSize} onChange={(v) => updateCurrentPageDesign({ itemNameSize: v })} min={14} max={32} />
                  <SizeSlider label="Description Size" value={design.descriptionSize} onChange={(v) => updateCurrentPageDesign({ descriptionSize: v })} min={10} max={20} />
                  <SizeSlider label="Price Size" value={design.priceSize} onChange={(v) => updateCurrentPageDesign({ priceSize: v })} min={14} max={32} />
                </div>
              </TabsContent>

              {/* STYLE TAB */}
              <TabsContent value="style" className="p-4 space-y-4 mt-0">
                {/* Page Size Selection */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <LayoutIcon className="w-4 h-4 text-emerald-500" />Page Size
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {PAGE_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => applyPageSizeToAllPages(size.id)}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          design.pageSizeId === size.id
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <span className="text-xs font-medium block">{size.name}</span>
                        <span className="text-[10px] opacity-70">{size.label}</span>
                        {design.pageSizeId === size.id && (
                          <Check className="w-3 h-3 mx-auto mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Selection */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <LayoutIcon className="w-4 h-4 text-emerald-500" />Layout Style
                  </h4>
                  <p className="text-neutral-400 text-xs">Applied to all pages</p>
                  <div className="grid grid-cols-3 gap-2">
                    {LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => applyLayoutToAllPages(layout.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          design.layout === layout.id
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <span className="text-xl block mb-1">{layout.icon}</span>
                        <span className="text-[10px] font-medium">{layout.name}</span>
                        {design.layout === layout.id && (
                          <Check className="w-3 h-3 mx-auto mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-500" />Colors
                  </h4>
                  <ColorPickerWithPresets label="Title Color" value={design.titleColor} onChange={(v) => updateCurrentPageDesign({ titleColor: v })} presets={COLOR_PRESETS.title} />
                  <ColorPickerWithPresets label="Price Color" value={design.priceColor} onChange={(v) => updateCurrentPageDesign({ priceColor: v })} presets={COLOR_PRESETS.price} />
                  <ColorPickerWithPresets label="Description Color" value={design.descriptionColor} onChange={(v) => updateCurrentPageDesign({ descriptionColor: v })} presets={COLOR_PRESETS.title} />
                </div>

                {/* Spacing */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Spacing</h4>
                  <SizeSlider label="Page Padding" value={design.padding} onChange={(v) => updateCurrentPageDesign({ padding: v })} min={20} max={100} />
                  <SizeSlider label="Item Spacing" value={design.itemSpacing} onChange={(v) => updateCurrentPageDesign({ itemSpacing: v })} min={12} max={48} />
                </div>

                {/* Food Safety Warning */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Food Safety Warning</h4>
                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300 text-xs">Show Warning</Label>
                    <Switch checked={design.showWarning} onCheckedChange={(v) => updateCurrentPageDesign({ showWarning: v })} />
                  </div>
                </div>
              </TabsContent>

              {/* BACKGROUND TAB */}
              <TabsContent value="background" className="p-4 space-y-4 mt-0">
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-500" />Background Color
                  </h4>
                  <ColorPickerWithPresets label="Background Color" value={design.backgroundColor} onChange={(v) => updateCurrentPageDesign({ backgroundColor: v })} presets={COLOR_PRESETS.background} />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-500" />Upload Custom Background
                  </h4>
                  
                  {customBackgroundPreview && (
                    <div className="relative">
                      <img src={customBackgroundPreview} alt="Custom background" className="w-full h-32 object-cover rounded-lg border-2 border-emerald-500" />
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <div className="bg-emerald-500 rounded-full p-2"><Check className="w-5 h-5 text-white" /></div>
                      </div>
                      <button onClick={removeCustomBackground} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}

                  <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-600 bg-neutral-700/50 hover:border-emerald-500/50'}`}>
                    <input {...getInputProps()} />
                    <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">{isDragActive ? 'Drop image here...' : 'Click or drag to upload'}</p>
                    <p className="text-neutral-400 text-xs mt-1">JPG, PNG, WebP • Max 5MB</p>
                  </div>
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />Preset Backgrounds
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => handlePresetBackgroundSelect(bg)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          design.backgroundImage === bg.url && design.backgroundImageType !== 'custom'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-neutral-600 hover:border-neutral-500'
                        }`}
                      >
                        {bg.thumbnail ? (
                          <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-neutral-600 flex items-center justify-center"><X className="w-5 h-5 text-neutral-400" /></div>
                        )}
                        {design.backgroundImage === bg.url && design.backgroundImageType !== 'custom' && (
                          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                            <div className="bg-emerald-500 rounded-full p-1.5"><Check className="w-4 h-4 text-white" strokeWidth={3} /></div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                          <p className="text-white text-[10px] font-medium truncate text-center">{bg.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {design.backgroundImage && (
                  <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                    <SizeSlider label="Image Visibility" value={design.backgroundOpacity} onChange={(v) => updateCurrentPageDesign({ backgroundOpacity: v })} min={10} max={100} unit="%" />
                  </div>
                )}
              </TabsContent>

              {/* BORDER TAB */}
              <TabsContent value="border" className="p-4 space-y-4 mt-0">
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Square className="w-4 h-4 text-emerald-500" />Simple Menu Border
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {BORDER_STYLES.map((border) => (
                      <button
                        key={border.id}
                        onClick={() => updateCurrentPageDesign({ menuBorderStyle: border.style })}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          design.menuBorderStyle === border.style
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <span className="text-[10px] font-medium">{border.name}</span>
                        {border.preview && <span className="text-xs opacity-70">{border.preview}</span>}
                      </button>
                    ))}
                  </div>
                  
                  {design.menuBorderStyle !== 'none' && (
                    <>
                      <SizeSlider label="Border Width" value={design.menuBorderWidth} onChange={(v) => updateCurrentPageDesign({ menuBorderWidth: v })} min={1} max={10} />
                      <ColorPickerWithPresets label="Border Color" value={design.menuBorderColor} onChange={(v) => updateCurrentPageDesign({ menuBorderColor: v })} presets={COLOR_PRESETS.title} />
                    </>
                  )}
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Frame className="w-4 h-4 text-emerald-500" />Decorative Frame
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {DECORATIVE_BORDERS.map((border) => (
                      <button
                        key={border.id}
                        onClick={() => updateCurrentPageDesign({ decorativeBorder: border.id })}
                        className={`p-3 rounded-lg border-2 transition-all relative ${
                          design.decorativeBorder === border.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-neutral-600 bg-neutral-700 hover:border-neutral-500'
                        }`}
                      >
                        <div className="text-center">
                          {border.corners ? (
                            <div className="flex items-center justify-center gap-1 text-lg mb-1">
                              <span>{border.corners}</span>
                              <span className="text-xs">{border.sides}{border.sides}{border.sides}</span>
                              <span>{border.corners}</span>
                            </div>
                          ) : (
                            <X className="w-5 h-5 mx-auto mb-1 text-neutral-500" />
                          )}
                          <span className={`text-xs font-medium ${design.decorativeBorder === border.id ? 'text-emerald-400' : 'text-neutral-300'}`}>
                            {border.name}
                          </span>
                        </div>
                        {design.decorativeBorder === border.id && (
                          <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {design.decorativeBorder !== 'none' && (
                    <ColorPickerWithPresets label="Frame Color" value={design.decorativeBorderColor} onChange={(v) => updateCurrentPageDesign({ decorativeBorderColor: v })} presets={COLOR_PRESETS.title} />
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {/* ITEM DIALOG */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl bg-neutral-800 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-emerald-500" />
              {editingItem ? 'Edit Menu Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-neutral-300 text-sm">Dish Name *</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white mt-1" placeholder="e.g., Grilled Salmon" />
            </div>
            <div>
              <Label className="text-neutral-300 text-sm">Key Ingredients (Optional)</Label>
              <Input value={itemForm.ingredients || ''} onChange={(e) => setItemForm({ ...itemForm, ingredients: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white mt-1" placeholder="e.g., Atlantic salmon, lemon butter" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-neutral-300 text-sm">Description</Label>
                <Button type="button" size="sm" onClick={handleGenerateDescription} disabled={generatingAI} className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />{generatingAI ? 'Generating...' : 'AI Chef Description'}
                </Button>
              </div>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white" placeholder="AI will generate..." rows={3} />
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />AI creates short, professional descriptions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-neutral-300 text-sm">Price *</Label>
                <Input value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white mt-1" placeholder="12.99" type="number" step="0.01" />
              </div>
              <div>
                <Label className="text-neutral-300 text-sm">Category</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                  <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-700 border-neutral-600 text-white z-50">
                    <SelectItem value="Appetizers">Appetizers</SelectItem>
                    <SelectItem value="Main Course">Main Course</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Salads">Salads</SelectItem>
                    <SelectItem value="Sides">Sides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-700">
              <Button variant="outline" onClick={() => setShowItemDialog(false)} className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">Cancel</Button>
              <Button onClick={handleSaveItem} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editingItem ? 'Update Item' : 'Add Item'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
